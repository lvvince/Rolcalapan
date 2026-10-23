import { Link } from "react-router-dom";
import "./home.css";

const FACEBOOK_URL = "https://www.facebook.com/riveroflifeintcalapan";

const services = [
  { title: "Sunday Worship", time: "Every Sunday", desc: "Join us in worship, the Word, and fellowship." },
  { title: "Prayer Meeting", time: "Weekly", desc: "Come together and pray for our church and community." },
  { title: "Bible Study", time: "Weekly", desc: "Grow in faith and learn the Word together." },
];

const features = [
  { icon: "📖", title: "Ministries", desc: "Find a ministry where you can serve and grow." },
  { icon: "📅", title: "Events", desc: "Stay updated with church activities and announcements." },
  { icon: "🙏", title: "Prayer Requests", desc: "Share your prayer needs with our church family." },
  { icon: "💬", title: "AI Assistant", desc: "Ask questions about the church anytime." },
];

export default function Home() {
  return (
    <div className="home">
      {/* NAVBAR */}
      <header className="home-nav">
        <div className="home-container home-nav-inner">
          <a href="#top" className="home-logo">River of Life <span>Calapan</span></a>
          <nav className="home-links">
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="home-actions">
            <Link to="/login" className="btn btn-outline">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="home-hero">
        <div className="home-container">
          <p className="home-eyebrow">Welcome to</p>
          <h1>River of Life Calapan</h1>
          <p className="home-sub">A church family where everyone is welcome. Let your life flow with God's love.</p>
          <div className="home-hero-btns">
            <Link to="/register" className="btn btn-primary btn-lg">Join Us</Link>
            <a href="#services" className="btn btn-light btn-lg">Service Times</a>
          </div>
        </div>
      </section>

      {/* VERSE */}
      <section className="home-verse">
        <div className="home-container">
          <figure className="verse-card">
            <blockquote className="verse-text">
             "He has made everything beautiful in its time.
              He has also set eternity in the human heart;
              yet no one can fathom what God has done from beginning to end." (NIV)
            </blockquote>
            <figcaption className="verse-ref">Ecclesiastes 3:11</figcaption>
          </figure>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="home-section">
        <div className="home-container home-narrow">
          <h2>About Us</h2>
          <p>
            River of Life Calapan is a community of believers committed to worshipping God,
            growing in His Word, and serving one another. Whether you are new to faith or have
            walked with Christ for years, you have a home here.
          </p>
          <p className="home-pastor">Pastor Alvin Jester Culla</p>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="home-section home-alt">
        <div className="home-container">
          <h2 className="center">Join Our Gatherings</h2>
          <div className="home-grid home-grid-3">
            {services.map((s) => (
              <div className="home-card" key={s.title}>
                <h3>{s.title}</h3>
                <span className="home-tag">{s.time}</span>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="home-section">
        <div className="home-container">
          <h2 className="center">What You Can Do</h2>
          <div className="home-grid home-grid-4">
            {features.map((f) => (
              <div className="home-card center" key={f.title}>
                <div className="home-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta">
        <div className="home-container">
          <h2>Be part of our church family</h2>
          <p>Create an account to access church information, events, and more.</p>
          <Link to="/register" className="btn btn-light btn-lg">Register Now</Link>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="home-footer">
        <div className="home-container home-footer-inner">
          <div>
            <strong>River of Life Calapan</strong>
            <p>Calapan City, Oriental Mindoro</p>
          </div>
          <div>
            <a href={FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook Page</a>
          </div>
        </div>
        <p className="home-copy">© {new Date().getFullYear()} River of Life Calapan. All rights reserved.</p>
      </footer>
    </div>
  );
}