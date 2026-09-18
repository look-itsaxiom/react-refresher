This counter has two bugs, both caused by reading a **stale snapshot** of `count`.

1. The **+3** button only adds 1.
2. The **+1 in a moment** button schedules an increment 300ms later, but it overwrites any clicks that happened while waiting. Click "+1 in a moment" and then "+3" quickly: you should end up 4 higher than you started, not 1.

Fix both without changing the JSX. Then hit **Run checks**.
