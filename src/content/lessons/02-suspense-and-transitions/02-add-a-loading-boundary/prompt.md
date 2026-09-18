`UserProfile` reads a user with `use(userPromise)`. Right now nothing catches the suspension, so the page shows **nothing at all** for the first ~600ms.

Make it show the text **Loading profile…** while the profile loads, and keep the `<h1>Profile</h1>` heading visible the whole time (the heading should never disappear).

Do not change `UserProfile` or how the promise is created.
