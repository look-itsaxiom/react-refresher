export default function ProfileCard() {
  return (
    <div className="profile-card">
      <img src="/avatar.jpg" alt="Jordan Lee" className="avatar" />
      <h2>Profile</h2>
      <h3>Preferences</h3>
      <button className="icon-btn" aria-label="Edit profile">
        <img src="/edit.svg" alt="" />
      </button>
      <div>
        <label htmlFor="display-name">Display name</label>
        <input id="display-name" type="text" defaultValue="Jordan Lee" />
      </div>
      <div id="stats-posts">42 posts</div>
      <div id="stats-followers">128 followers</div>
      <a href="https://twitter.com/jordanlee" aria-label="Jordan Lee on Twitter">
        <img src="/twitter.svg" alt="" />
      </a>
      <div className="decorative-wrap">
        <button>Follow</button>
      </div>
    </div>
  );
}
