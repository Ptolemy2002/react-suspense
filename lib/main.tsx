import { createProxyContextProvider, createProxyContext, useProxyContext, Dependency } from "@ptolemy2002/react-proxy-context";
import React, { useRef, useState, useCallback, MutableRefObject } from "react";
import isCallable from "is-callable";
import { useMountEffect } from "@ptolemy2002/react-mount-effects";
import { partialMemo } from "@ptolemy2002/react-utils";
import styled, {css} from "styled-components";
import { MaybePromise } from "@ptolemy2002/ts-utils";

export class SuspenseTimeoutError extends Error {
  isTimeout = true;

  constructor(message="Suspense timeout.") {
      super(message);
      this.name = "SuspenseTimeoutError";
  }
}

export type SuspendOptions = {
  timeout?: number | null;
  onForceEnd?: ((v: any, reason: "timeout" | "cancel") => void) | null;
  onCancel?: ((v: any) => void) | null;
  onTimeout?: ((e: SuspenseTimeoutError) => void) | null;
}

export class SuspenseController {
    isLoading = false;
    suspenseCount = 0;
    startTime: number | null = null;
    endTime: number | null = null;
    elapsedTime: number | null = null;

    _reject: ((v: any) => void) | null = null;

    constructor(isLoading=false) {
        this.isLoading = isLoading;
    }

    cancel(v: any) {
        if (!this.isLoading) return console.warn("Suspense is not active, so will not cancel.");
        if (isCallable(this._reject)) this._reject(v);
    }

    async suspend<T>(
      fn: () => MaybePromise<T>,
      {timeout=null, onForceEnd=null, onCancel=null, onTimeout=null}: SuspendOptions = {}
    ): Promise<T | null> {
        if (this.isLoading && this.suspenseCount > 0) {
            console.warn("Suspense is already active, so will not start again.");
            return null;
        }
        this.isLoading = true;

        this.startTime = Date.now();
        this.endTime = null;
        this.elapsedTime = null;
        
        try {
            return await Promise.race([
                fn(),
                new Promise((_, reject) => {
                    if (timeout !== null) {
                        setTimeout(() => {
                            const e = new SuspenseTimeoutError("Suspense timeout.");
                            reject(e);
                            if (isCallable(onTimeout)) onTimeout(e);
                            if (isCallable(onForceEnd)) onForceEnd(e, "timeout");
                        }, timeout);
                    }

                    this._reject = (v) => {
                        reject(v);
                        if (isCallable(onCancel)) onCancel(v);
                        if (isCallable(onForceEnd)) onForceEnd(v, "cancel");
                    }
                }) as Promise<never>
            ]);
        } finally {
            this.endTime = Date.now();
            this.elapsedTime = this.endTime - this.startTime;
            this._reject = null;

            this.suspenseCount++;
            this.isLoading = false;
        }
    }
}

const SuspenseContext = createProxyContext<SuspenseController>("SuspenseContext");
const SuspenseContextProvider = createProxyContextProvider(SuspenseContext);

export type SuspenseBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  init?: (() => MaybePromise<any>) | null;
  renderDeps?: any[];
};

export const SuspenseBoundary = partialMemo(({children, fallback, init, renderDeps=[]}: SuspenseBoundaryProps) => {
  const valueRef = useRef<SuspenseController>();
  // This is done to avoid creating unecessary instances of SuspenseController
  if (valueRef.current === undefined) valueRef.current = new SuspenseController(isCallable(init));

  const [show, setShow] = useState(!isCallable(init));

  const onChange = useCallback((prop: keyof SuspenseController) => {
      if (prop === "isLoading") {
          // Use setTimeout to avoid React warnings.
          setTimeout(() => setShow(!valueRef.current?.isLoading), 0);
      }
  }, []);

  useMountEffect(() => {
      if (isCallable(init)) {
          valueRef.current?.suspend(init).then(() => setShow(true));
      }
  });

  return (
      // Hide instead of unmounting to avoid losing state.
      <SuspenseContextProvider 
          value={valueRef.current}
          proxyRef={valueRef as MutableRefObject<SuspenseController>}
          onChangeProp={onChange}
          renderDeps={[show, ...renderDeps]}
      >
          <SuspenseChild $show={!show}>{fallback}</SuspenseChild>
          <SuspenseChild $show={show}>{children}</SuspenseChild>
      </SuspenseContextProvider>
  )
}, ["children", "fallback"], "SuspenseBoundary");

export function useSuspenseController(deps: Dependency<SuspenseController>[] = [(p, v, prev) => p === "isLoading" && v === false && prev === true]) {
  return useProxyContext(SuspenseContext, deps);
}

export const SuspenseChild = styled.div.attrs<{$show: boolean}>((props) => ({
    $show: props.$show
}))`
    ${(props) => !props.$show && css`
        visibility: hidden;
        overflow: hidden;
        height: 0;
        width: 0;
    `}
`;