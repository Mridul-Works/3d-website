"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./herosection.css";

export default function HeroSection() {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("sectionOne"); // "sectionOne" | "playing" | "sectionThree"
  const [videoProgress, setVideoProgress] = useState(0);
  const [sectionThreeVisible, setSectionThreeVisible] = useState(false);

  // Accumulated wheel delta — we use this to decide when to "trigger" the video
  const wheelAccumRef = useRef(0);
  const isPlayingRef = useRef(false);
  const phaseRef = useRef("sectionOne");

  const setPhaseSync = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Lock body scroll entirely
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";

    video.pause();
    video.currentTime = 0;

    // ── Play the video straight through ──────────────────────────────────
    const playVideo = () => {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;
      setPhaseSync("playing");

      video.currentTime = 0;
      video.play().catch(() => {});
    };

    // ── Video ended → show sectionThree ──────────────────────────────────
    const handleEnded = () => {
      isPlayingRef.current = false;
      setPhaseSync("sectionThree");
      setSectionThreeVisible(true);
    };

    // ── Track progress for the indicator ─────────────────────────────────
    const handleTimeUpdate = () => {
      if (video.duration) {
        setVideoProgress(video.currentTime / video.duration);
      }
    };

    // ── Wheel / scroll handler ────────────────────────────────────────────
    // • On sectionOne: accumulate wheel delta; once threshold hit → play video
    // • While playing:  block scroll entirely
    // • On sectionThree: allow normal (virtual) scroll — we restore body overflow
    const TRIGGER_THRESHOLD = 80; // px of wheel delta needed to trigger

    const handleWheel = (e) => {
      if (phaseRef.current === "playing") {
        e.preventDefault();
        return;
      }

      if (phaseRef.current === "sectionOne") {
        // Only trigger on downward scroll
        if (e.deltaY > 0) {
          wheelAccumRef.current += e.deltaY;
          if (wheelAccumRef.current >= TRIGGER_THRESHOLD) {
            wheelAccumRef.current = 0;
            playVideo();
          }
        }
        e.preventDefault();
        return;
      }

      // sectionThree phase — allow natural scroll (don't preventDefault)
    };

    // Touch support
    let touchStartY = 0;
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e) => {
      if (phaseRef.current === "playing") {
        e.preventDefault();
        return;
      }
      if (phaseRef.current === "sectionOne") {
        const delta = touchStartY - e.touches[0].clientY;
        if (delta > 30) {
          playVideo();
        }
        e.preventDefault();
      }
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // When sectionThree is reached, unlock body scroll
  useEffect(() => {
    if (phase === "sectionThree") {
      document.body.style.overflow = "";
      document.body.style.height = "";
    }
  }, [phase]);

  return (
    <div className="mainScrollingWrapper">
      {/* ── Fixed background video ── */}
      <div className="backgroundVideo">
        <video
          ref={videoRef}
          src="https://files.mastersunion.link/uploads/04062026/v1/newVideo.mp4"
          preload="auto"
          muted
          playsInline
        />
      </div>

      {/* ── Progress bar (visible only while playing) ── */}
      {phase === "playing" && (
        <div className="videoProgressBar">
          <div
            className="videoProgressFill"
            style={{ width: `${videoProgress * 100}%` }}
          />
        </div>
      )}

      {/* ── Scroll hint (visible on sectionOne) ── */}
      {phase === "sectionOne" && (
        <div className="scrollHint">
          <span>Scroll down to begin</span>
          <div className="scrollHintArrow" />
        </div>
      )}

      {/* ── Section One ── */}
      <section
        className={`hero fixed-section ${phase === "sectionOne" ? "visible" : "hidden"}`}
        id="sectionOne"
      >
        <div className="container">
          <div className="innerWrapper">
            <h1>Section 1 — Start</h1>
            <p className="section-description">Scroll down to play the video</p>
            <div className="glassCardsWrapper">
              {["Card 1", "Card 2", "Card 3"].map((card, i) => (
                <div className="glassCard" key={i}>
                  <h2>{card}</h2>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Three (appears after video) ── */}
      <section
        className={`hero ${sectionThreeVisible ? "sectionThree-enter" : "sectionThree-hidden"}`}
        id="sectionThree"
        style={{
          position: sectionThreeVisible ? "relative" : "fixed",
          // keep it off-screen until revealed
          top: sectionThreeVisible ? "auto" : "100vh",
        }}
      >
        <div className="container">
          <div className="innerWrapper">
            <h1>Section 3 — Final Checkpoint</h1>
            <p className="section-description">Video has finished playing</p>
            <div className="glassCardsWrapper">
              {["Card 1", "Card 2", "Card 3"].map((card, i) => (
                <div className="glassCard" key={i}>
                  <h2>{card}</h2>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}