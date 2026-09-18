Clicking **Posts** suspends while the posts load. Right now the whole tab panel, including the currently visible **Home** content, is replaced by the fallback.

Make the tab switch a transition so that:

1. The **Home** content stays visible while Posts loads (the fallback must not appear when switching from a visible tab).
2. The `<nav>` gets `data-pending="true"` while the transition is pending, and `"false"` otherwise, so the UI can show a subtle indicator.

Keep the `Posts` component and the `fetchPosts()` call as they are.
