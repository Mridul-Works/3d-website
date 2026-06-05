"use client";

import { useEffect, useRef, useState } from "react";
import "./herosection.css";

// ── Speed-ramp curve ──────────────────────────────────────────────────────────
// Smooth-step interpolation across 5 keyframe anchors [position, rate].
// • 0%   → 1.6×  energetic opening burst
// • 30%  → 1.1×  quick settle
// • 60%  → 1.0×  cruise
// • 82%  → 0.85× deceleration begins
// • 100% → 0.6×  cinematic landing
function getPlaybackRate(progress) {
  const kf = [
    [0.0,  1.6],
    [0.3,  1.1],
    [0.6,  1.0],
    [0.82, 0.85],
    [1.0,  0.6],
  ];

  if (progress <= kf[0][0]) return kf[0][1];
  if (progress >= kf[kf.length - 1][0]) return kf[kf.length - 1][1];

  for (let i = 0; i < kf.length - 1; i++) {
    const [p0, r0] = kf[i];
    const [p1, r1] = kf[i + 1];
    if (progress >= p0 && progress <= p1) {
      const t = (progress - p0) / (p1 - p0);
      const s = t * t * (3 - 2 * t); // smoothstep
      return r0 + (r1 - r0) * s;
    }
  }
  return 1.0;
}

export default function HeroSection() {
  const videoRef        = useRef(null);
  const phaseRef        = useRef("sectionOne");
  const rafRef          = useRef(null);
  const wheelAccumRef   = useRef(0);
  const isPlayingRef    = useRef(false);

  const [phase, setPhase]                     = useState("sectionOne");
  const [videoProgress, setVideoProgress]     = useState(0);
  const [sectionThreeVisible, setSectionThreeVisible] = useState(false);

  // Keep phase state + ref in sync from one place
  const applyPhase = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Lock scroll while in sectionOne / playing
    document.body.style.overflow = "hidden";
    document.body.style.height   = "100vh";

    video.pause();
    video.currentTime = 0;

    // ── rAF loop: drives playbackRate + progress bar ──────────────────────
    const stopLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const startLoop = () => {
      stopLoop();
      const tick = () => {
        if (video.duration && !video.ended) {
          const progress = video.currentTime / video.duration;
          video.playbackRate = getPlaybackRate(progress);
          setVideoProgress(progress);
        }
        // Keep looping as long as we are in the playing phase
        if (phaseRef.current === "playing") {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    // ── Trigger playback ──────────────────────────────────────────────────
    const playVideo = () => {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;

      video.currentTime = 0;
      video.playbackRate = getPlaybackRate(0);

      // applyPhase must happen before startLoop so phaseRef is "playing"
      applyPhase("playing");
      startLoop();

      video.play().catch(() => {
        // Autoplay blocked — reset gracefully
        stopLoop();
        isPlayingRef.current = false;
        applyPhase("sectionOne");
      });
    };

    // ── Video ended ───────────────────────────────────────────────────────
    const handleEnded = () => {
      stopLoop();
      video.playbackRate = 1.0;
      isPlayingRef.current = false;
      applyPhase("sectionThree");
      setSectionThreeVisible(true);
    };

    // ── Wheel handler ─────────────────────────────────────────────────────
    const TRIGGER_THRESHOLD = 80;

    const handleWheel = (e) => {
      const current = phaseRef.current;

      if (current === "playing") {
        e.preventDefault();
        return;
      }

      if (current === "sectionOne") {
        e.preventDefault();
        if (e.deltaY > 0) {
          wheelAccumRef.current += e.deltaY;
          if (wheelAccumRef.current >= TRIGGER_THRESHOLD) {
            wheelAccumRef.current = 0;
            playVideo();
          }
        }
        return;
      }

      // sectionThree — allow natural scroll
    };

    // ── Touch handler ─────────────────────────────────────────────────────
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const current = phaseRef.current;
      if (current === "playing") {
        e.preventDefault();
        return;
      }
      if (current === "sectionOne") {
        e.preventDefault();
        if (touchStartY - e.touches[0].clientY > 30) {
          playVideo();
        }
      }
    };

    video.addEventListener("ended", handleEnded);
    window.addEventListener("wheel",       handleWheel,      { passive: false });
    window.addEventListener("touchstart",  handleTouchStart, { passive: true  });
    window.addEventListener("touchmove",   handleTouchMove,  { passive: false });

    return () => {
      stopLoop();
      document.body.style.overflow = "";
      document.body.style.height   = "";
      video.removeEventListener("ended", handleEnded);
      window.removeEventListener("wheel",      handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove",  handleTouchMove);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unlock scroll once sectionThree is active
  useEffect(() => {
    if (phase === "sectionThree") {
      document.body.style.overflow = "";
      document.body.style.height   = "";
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
          style={{ willChange: "transform", transform: "translateZ(0)" }}
        />
      </div>

      {/* ── Progress bar (playing only) ── */}
      {phase === "playing" && (
        <div className="videoProgressBar">
          <div
            className="videoProgressFill"
            style={{ width: `${videoProgress * 100}%` }}
          />
        </div>
      )}

      {/* ── Scroll hint (sectionOne only) ── */}
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

      {/* ── Section Three (revealed after video ends) ── */}
      <section
        className={`hero ${sectionThreeVisible ? "sectionThree-enter" : "sectionThree-hidden"}`}
        id="sectionThree"
        style={{
          position: sectionThreeVisible ? "relative" : "fixed",
          top:      sectionThreeVisible ? "auto"     : "100vh",
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