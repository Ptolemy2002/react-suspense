import { ProxyContextProvider, createProxyContext, useProxyContext } from "@ptolemy2002/react-proxy-context";
import React, { useRef, useState, useCallback } from "react";
import isCallable from "is-callable";
import { useMountEffect } from "@ptolemy2002/react-mount-effects";

export class SuspenseTimeoutError extends Error {
    isTimeout = true;

    constructor(message="Suspense timeout.") {
        super(message);
        this.name = "SuspenseTimeoutError";
    }
}

export class SuspenseController {
    isLoading = false;
    suspenseCount = 0;
    startTime = null;
    endTime = null;
    elapsedTime = null;

    _reject = null;
    _resolve = null;

    constructor(isLoading=false) {
        this.isLoading = isLoading;
    }

    cancel(v) {
        if (!this.isLoading) return console.warn("Suspense is not active, so will not cancel.");
        if (isCallable(this._reject)) this._reject(v);
    }

    forceResume(v) {
        if (!this.isLoading) return console.warn("Suspense is not active, so will not resume.");
        if (isCallable(this._resolve)) this._resolve(v);
    }

    async suspend(fn=() => {}, timeout=null) {
        if (this.isLoading && this.suspenseCount > 0) return console.warn("Suspense is already active, so will not start again.");
        this.isLoading = true;

        this.startTime = Date.now();
        this.endTime = null;
        this.elapsedTime = null;
        
        try {
            return await Promise.race([
                fn(),
                new Promise((resolve, reject) => {
                    if (timeout !== null) {
                        setTimeout(() => {
                            reject(new SuspenseTimeoutError("Suspense timeout."));
                        }, timeout);
                    }

                    this._reject = reject;
                    this._resolve = resolve;
                })
            ]);
        } finally {
            this.endTime = Date.now();
            this.elapsedTime = this.endTime - this.startTime;
            this._reject = null;
            this._resolve = null;

            this.suspenseCount++;
            this.isLoading = false;
        }
    }
}

const SuspenseContext = createProxyContext(undefined, "SuspenseContext");

const hiddenStyle = {visibility: "hidden", overflow: "hidden", width: 0, height: 0};
const visibleStyle = {visibility: "visible"};

export function SuspenseBoundary({children, fallback, init}) {
    const valueRef = useRef();
    // This is done to avoid creating unecessary instances of SuspenseController
    if (valueRef.current === undefined) valueRef.current = new SuspenseController(isCallable(init));

    const [show, setShow] = useState(!isCallable(init));

    const onChange = useCallback((prop) => {
        if (prop === "isLoading") {
            setShow(!valueRef.current.isLoading);
        }
    }, []);

    useMountEffect(() => {
        if (isCallable(init)) {
            valueRef.current.suspend(init).then(() => setShow(true));
        }
    });

    return (
        // Hide instead of unmounting to avoid losing state.
        <ProxyContextProvider contextClass={SuspenseContext} value={valueRef.current} proxyRef={valueRef} onChange={onChange}>
            <div style={show ? hiddenStyle : visibleStyle}>
                {fallback}
            </div>

            <div style={show ? visibleStyle : hiddenStyle}>
                {children}
            </div>
        </ProxyContextProvider>
    )
}

export function useSuspenseController(deps=["suspenseCount"]) {
    return useProxyContext(SuspenseContext, deps);
}