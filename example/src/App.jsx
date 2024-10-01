import { useCallback, useState } from "react";
import { SuspenseBoundary, useSuspenseController } from "@ptolemy2002/react-suspense";
import { ErrorBoundary, useErrorBoundary } from "react-error-boundary";
import useManualErrorHandling from "@ptolemy2002/react-manual-error-handling";
import clsx from "clsx";

async function wait(ms, error=false) {
  return new Promise((resolve, reject) => setTimeout(() => {
    if (error) return reject(new Error("Intentional app design"));
    resolve(true);
  }, ms));
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  console.log("App rendered");

  return (
    <div className="App p-3">
      <ErrorBoundary fallback={<ErrorNotice />}>
        <SuspenseBoundary fallback={<LoadingNotice allowCancel={initialized} />} 
          init={async () => {
            await wait(2000);
            setInitialized(true);
          }}
        >
          <h1>React Suspense Test</h1>
          <Main />
        </SuspenseBoundary>
      </ErrorBoundary>
    </div>
  );
}

function ErrorNotice() {
  const {resetBoundary} = useErrorBoundary();

  return (
    <div className="alert alert-danger">
      <p>An error occurred.</p>
      <button onClick={resetBoundary}>Try again</button>
    </div>
  );
}

function LoadingNotice({allowCancel}) {
  const [sc] = useSuspenseController([]);

  return (
    <div className="alert alert-info">
      <p>Loading...</p>
      {allowCancel && <button onClick={() => sc.forceResume(false)}>Cancel</button>}
    </div>
  );
}

function Main() {
  const {_try} = useManualErrorHandling();
  const [{ suspend, elapsedTime }] = useSuspenseController();
  const [red, setRed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [result, setResult] = useState(true);
  console.log("Main rendered");

  const suspenseCatch = useCallback(
    (e) => {
      if (e.isTimeout) {
        console.log("Timeout caught");
        setTimedOut(true);
      } else {
        throw e;
      }
    },
    []
  );

  const handleSuspend = useCallback(
    async () => setResult(await suspend(() => {
      setTimedOut(false);
      return wait(2000);
    }, {
      onForceEnd: (v, reason) => {
        console.log("Ending forcefully with", v, "due to", reason);
      }
    }).catch(suspenseCatch)),
    [suspend, suspenseCatch]
  );

  const handleErrorSuspend = useCallback(
    async () => setResult(await suspend(() => {
      setTimedOut(false);
      return wait(2000, true);
    }, {
      onForceEnd: (v, reason) => {
        console.log("Ending forcefully with", v, "due to", reason);
      }
    }).catch(suspenseCatch)),
    [suspend, suspenseCatch]
  );

  const handleTimeoutSuspend = useCallback(
    async () => setResult(await suspend(() => {
      setTimedOut(false);
      return wait(2000);
    }, {
      timeout: 1000,
      onForceEnd: (v, reason) => {
        console.log("Ending forcefully with", v, "due to", reason);
      }
    }).catch(suspenseCatch)),
    [suspend, suspenseCatch]
  );

  return (
    <div className={clsx("m-3 p-3", red && "border border-1 border-danger")}>
      {
        timedOut ?
          <p>Timed out after {elapsedTime || "N/A"}</p>
        : result ?
          <p>Elapsed Time: {elapsedTime || "N/A"}</p>
        :
          <p>Cancelled after {elapsedTime || "N/A"}</p>
      }

    <div className="d-flex flex-column gap-3" style={{width: "fit-content"}}>
          <button onClick={() => _try(handleSuspend)}>Suspend</button>
          <button onClick={() => _try(handleErrorSuspend)}>Suspend with Error</button>
          <button onClick={() => _try(handleTimeoutSuspend)}>Suspend with Timeout</button>
          <button onClick={() => setRed(!red)}>Toggle Red</button>
        </div>
    </div>
  );
}