# React Library CRA Project
This library is an attempt to implement an API similar to React 19's [Suspense](https://react.dev/reference/react/Suspense), but on the client and with a few differences:
- Components are not unmouted when they are suspended, just hidden.
- Instead of promises being passed to the children, the children call a function to execute arbitrary asynchronous code that suspends the components.
- There is support for implementing a timeout and manually resume or cancel the current action.

The git repository conttains an example app that uses this library as intended, but here's a quick example:
```
import { SuspenseBoundary, useSuspenseController } from '@ptolemy2002/react-suspense';

function MyComponent() {
    return (
        <SuspenseBoundary>
            <Suspense fallback={<div>Loading...</div>}>
                <MyAsyncComponent />
            </Suspense>
        </SuspenseBoundary>
    );
}

function MyAsyncComponent() {
    const [{suspend}] = useSuspenseController();

    return (
        <button onClick={() => {
            suspend(async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
            });
        }}>
            Click me!
        </button>
    );
}
```

The functions are not exported as default, so you can import them in one of the following ways:
```
// ES6
import { functionName } from '@ptolemy2002/react-suspense';
// CommonJS
const { functionName } = require('@ptolemy2002/react-suspense');
```

## Classes
The following classes are available in the library:

### SuspenseTimeoutError
#### Description
A basic error class that is thrown when a suspense action times out. It is a subclass of `Error`. You can check if an error is of this type by using `e instanceof SuspenseTimeoutError`, `e.name === 'SuspenseTimeoutError'`, or `e.isTimeout`.

#### Parameters
- `message` (String): The message to be displayed when the error is thrown. Default is 'Suspense timeout.'

### SuspenseController
#### Description
This is the class that is provided by the `useSuspenseController` hook. It contains methods to suspend, resume, and cancel the current action, along with properties that can be used to check times.

#### Properties
- `isLoading` (Boolean): `true` if the current action is suspended, `false` otherwise.
- `suspenseCount` (Number): The number of times the boundary has been suspended.
- `startTime` (Number): The time at which the last action started, or `null` if no action has started yet or a current action is in progress.
- `endTime` (Number): The time at which the last action ended, or `null` if no action has ended yet or a current action is in progress.
- `elapsedTime` (Number): The time in milliseconds between the start and end of the last action, or `null` if no action has ended yet or a current action is in progress.

#### Methods
- `suspend` (Function): Suspends the current action and executes the provided function, returning its result.
    - Arguments:
        - `fn` (Function): The function to be executed asynchronously.
        - `args` (Object): An object that can optionally specify the following properties:
            - `timeout` (Number): The time in milliseconds before the action times out. Default is `null`, meaning no timeout. When the timeout is reached, `SuspenseTimeoutError` is thrown.
            - `onTimeout` (Function): A function that is called when the action times out. Passed the timeout error as an argument. Default is `null`.
            - `onCancel` (Function): A function that is called when the action is cancelled. Passed the cancellation value as an argument. Default is `null`.
            - `onForceResume` (Function): A function that is called when the `forceResume` Passed the resolution value as an argument. Default is `null`.
            - `onForceEnd` (Function): A function that is called when the action either times out, is cancelled, or `forceResume` is called. Passed the resulting value (timeout error, cancellation value, or resolution value) as the first argument and a description of the cause as the second argument (either 'timeout', 'cancel', or 'resume'). Default is `null`.
    - Returns:
        - Any - The result of the function.
- `forceResume` (Function): Resumes the current action by resolving.
    - Arguments:
        - `result` (Any): The result to be returned by the `suspend` function.
    - Returns:
        - None
- `cancel` (Function): Cancels the current action by rejecting.
    - Arguments:
        - `result` (Any): The result to be thrown by the `suspend` function.
    - Returns:
        - None

## Components
The following components are available in the library:

### SuspenseBoundary
#### Description
A component that is necessary to use the library's features. It provides a `SuspenseController` object to its children using context. the `fallback` is shown when an action is in progress and `children` is shown otherwise. Note that no component ever gets unmounted, just hidden.

#### Props
- `fallback` (ReactNode): The component to show when an action is in progress.
- `init` (Function): A function that is called when the boundary first mounts. If this is specified, the boundary starts in a suspended state.

## Hooks
The following hooks are available in the library:

### useSuspenseController
#### Description
A hook that provides the `SuspenseController` object from the nearest `SuspenseBoundary` component along with a setter to reassign it if you need to do so for some reason.

#### Parameters
- `deps` - An array of properties of the `SuspenseController` object to listen to. If any of these properties change, the hook will re-render. If this is falsy, any mutation will trigger a re-render. You can also specify a function that returns a boolean to determine whether to re-render, provided with the following arguments:
    - `prop` (String): The property that changed.
    - `value` (Any): The current value of the property.
    - `prevValue` (Any): The previous value of the property.
    - `current` (Object): The current context object.

#### Returns
- Array - An array with the first element being the current `SuspenseController` object and the second element being a setter function to reassign the context.

## Meta
This is a React Library Created by Ptolemy2002's [cra-template-react-library](https://www.npmjs.com/package/@ptolemy2002/cra-template-react-library) template in combination with [create-react-app](https://www.npmjs.com/package/create-react-app). It contains methods of building and publishing your library to npm.
For now, the library makes use of React 18 and does not use TypeScript.

## Peer Dependencies
These should be installed in order to use the library, as npm does not automatically add peer dependencies to your project.
- @types/react: ^18.3.3
- @types/react-dom: ^18.3.0
- react: ^18.3.1
- react-dom: ^18.3.1

## Commands
The following commands exist in the project:

- `npm run uninstall` - Uninstalls all dependencies for the library
- `npm run reinstall` - Uninstalls and then Reinstalls all dependencies for the library
- `npm run example-uninstall` - Uninstalls all dependencies for the example app
- `npm run example-install` - Installs all dependencies for the example app
- `npm run example-reinstall` - Uninstalls and then Reinstalls all dependencies for the example app
- `npm run example-start` - Starts the example app after building the library
- `npm run build` - Builds the library
- `npm run release` - Publishes the library to npm without changing the version
- `npm run release-patch` - Publishes the library to npm with a patch version bump
- `npm run release-minor` - Publishes the library to npm with a minor version bump
- `npm run release-major` - Publishes the library to npm with a major version bump