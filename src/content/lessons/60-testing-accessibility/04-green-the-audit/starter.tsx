export default function ProfileCard() {
  return (
    <div className="profile-card">
      <img src="/avatar.jpg" className="avatar" />
      <h2>Profile</h2>
      <h4>Preferences</h4>
      <button className="icon-btn">
        <img src="/edit.svg" alt="" />
      </button>
      <div>
        <input type="text" placeholder="Display name" defaultValue="Jordan Lee" />
      </div>
      <div id="stats">42 posts</div>
      <div id="stats">128 followers</div>
      <a href="https://twitter.com/jordanlee">
        <img src="/twitter.svg" alt="" />
      </a>
      <div aria-hidden="true" className="decorative-wrap">
        <button>Follow</button>
      </div>
    </div>
  );
}
