# Pre-render the next screen

`Wizard` has two steps. Step 2 runs an expensive one-time setup (`onInit`) the moment it
first exists — modeling something like parsing a large dataset or warming a chart library.
It's written as a lazy `useState` initializer, which is the right way to model "run this
exactly once, the moment this component is created": it runs during that first render, not
on every render.

Right now, step 2 only gets created once the user clicks "Next," so they hit that setup
cost right when they're waiting to see the next screen.

Step 1 has nothing else going on while the user reads it — that's dead time you can spend
creating step 2, off-screen, in the background.

Fix it using `<Activity>`:

- Mount **both** steps immediately, wrapping each in its own `<Activity>` with `mode`
  driven by which step is current (`"visible"` for the current step, `"hidden"` for the
  other).
- Step 2's setup should already have happened by the time the user clicks "Next" — its
  init count should already be `1` before anyone clicks anything.
- Clicking "Next" must not run the setup a second time.

Don't change `Step1` or `Step2`'s own behavior, and don't call `onInit` from anywhere
except `Step2`'s existing lazy initializer.
