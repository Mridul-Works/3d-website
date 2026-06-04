"use client";

import studio from "@theatre/studio";
import { getProject } from "@theatre/core";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./herosection.css";

if (typeof window !== "undefined") {
  studio.initialize();
}

const project = getProject("My Project");

export default function HeroSection() {
  const sectionWrapperRef = useRef(null);
  const videoRef = useRef(null);
  const [activeSection, setActiveSection] = useState("sectionOne");
  
  // Checkpoints with their timeline positions (in seconds)
  const checkpoints = [
    { id: "sectionOne", videoTime: 0, label: "Start" },
    { id: "sectionTwo", videoTime: 3, label: "First Checkpoint" },
    { id: "sectionThree", videoTime: 5, label: "Second Checkpoint" }
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    const video = videoRef.current;
    const sectionWrapper = sectionWrapperRef.current;
    
    if (!video || !sectionWrapper) return;

    // Pause video initially
    video.pause();
    video.currentTime = 0;

    // Create Theatre.js sheet for additional animations
    const sheet = project.sheet("Scroll Sheet");
    const obj = sheet.object("Animation Controls", {
      scrollProgress: 0,
      currentVideoTime: 0,
      sectionProgress: 0
    });

    // Calculate scroll ranges for each checkpoint
    const getCheckpointScrollPositions = () => {
      const sections = ["sectionOne", "sectionTwo", "sectionThree"];
      const positions = {};
      let totalScroll = 0;
      
      sections.forEach((sectionId, index) => {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const scrollPosition = window.scrollY + rect.top;
          positions[sectionId] = scrollPosition;
          totalScroll = scrollPosition;
        }
      });
      
      return positions;
    };

    // Smooth scroll to checkpoint
    const scrollToCheckpoint = (checkpointId, duration = 1) => {
      const element = document.getElementById(checkpointId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    };

    // Update active section based on video time
    const updateActiveSection = (videoTime) => {
      if (videoTime >= 0 && videoTime < 3) {
        setActiveSection("sectionOne");
      } else if (videoTime >= 3 && videoTime < 5) {
        setActiveSection("sectionTwo");
      } else if (videoTime >= 5) {
        setActiveSection("sectionThree");
      }
    };

    // Main scroll handler with checkpoint logic
    let isScrolling = false;
    let targetVideoTime = 0;
    
    const handleScroll = () => {
      if (isScrolling) return;
      
      const scrollY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      let scrollProgress = scrollY / maxScroll;
      
      // Clamp progress
      scrollProgress = Math.min(Math.max(scrollProgress, 0), 1);
      
      // Map scroll progress to video time (0 to 5 seconds max)
      // Video will play only up to 5 seconds total
      const maxVideoTime = 5; // Total video duration we want to use
      const targetTime = scrollProgress * maxVideoTime;
      
      // Smoothly interpolate video time
      targetVideoTime = Math.min(Math.max(targetTime, 0), maxVideoTime);
      
      // Update video current time with smooth interpolation
      if (video.duration && !isNaN(video.duration)) {
        // Map our target time to actual video duration
        const actualVideoTime = (targetVideoTime / maxVideoTime) * video.duration;
        video.currentTime = actualVideoTime;
        
        // Update Theatre.js
        obj.props.currentVideoTime = actualVideoTime;
        obj.props.scrollProgress = scrollProgress;
        
        // Update active section
        updateActiveSection(targetVideoTime);
        
        // Calculate section progress (0-1 between checkpoints)
        let sectionProgress = 0;
        if (targetVideoTime >= 0 && targetVideoTime < 3) {
          sectionProgress = targetVideoTime / 3;
        } else if (targetVideoTime >= 3 && targetVideoTime < 5) {
          sectionProgress = 1 + (targetVideoTime - 3) / 2;
        } else if (targetVideoTime >= 5) {
          sectionProgress = 2;
        }
        obj.props.sectionProgress = sectionProgress;
      }
      
      // Apply transform to section wrapper with smooth easing
      const viewportHeight = window.innerHeight;
      const sectionWrapperHeight = sectionWrapper.scrollHeight;
      const scrollRange = -(sectionWrapperHeight - viewportHeight);
      const targetY = scrollRange * scrollProgress;
      
      // Use GSAP for smooth transform
      gsap.to(sectionWrapper, {
        y: targetY,
        duration: 0.1,
        ease: "power2.out"
      });
    };

    // Smooth scroll with GSAP ScrollTrigger for better control
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5, // Smooth scrubbing with 0.5s lag
      onUpdate: (self) => {
        const progress = self.progress;
        const maxVideoTime = 5;
        const targetTime = progress * maxVideoTime;
        
        if (video.duration && !isNaN(video.duration)) {
          const actualVideoTime = (targetTime / maxVideoTime) * video.duration;
          
          // Smooth video seeking
          if (Math.abs(video.currentTime - actualVideoTime) > 0.01) {
            video.currentTime = actualVideoTime;
          }
          
          updateActiveSection(targetTime);
        }
        
        // Smooth section wrapper movement
        const viewportHeight = window.innerHeight;
        const sectionWrapperHeight = sectionWrapper.scrollHeight;
        const scrollRange = -(sectionWrapperHeight - viewportHeight);
        const targetY = scrollRange * progress;
        
        gsap.to(sectionWrapper, {
          y: targetY,
          duration: 0.2,
          ease: "power2.out"
        });
      }
    });

    // Throttled scroll handler
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Handle video metadata loaded
    const handleVideoLoaded = () => {
      video.pause();
      video.currentTime = 0;
      handleScroll();
    };

    // Snap to nearest checkpoint when scrolling stops
    let scrollTimeout;
    const handleScrollEnd = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentTime = video.currentTime;
        const videoDuration = video.duration;
        const maxVideoTime = 5;
        const currentProgress = (currentTime / videoDuration) * maxVideoTime;
        
        // Find nearest checkpoint
        let nearestCheckpoint = checkpoints[0];
        let minDistance = Math.abs(currentProgress - checkpoints[0].videoTime);
        
        checkpoints.forEach(checkpoint => {
          const distance = Math.abs(currentProgress - checkpoint.videoTime);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCheckpoint = checkpoint;
          }
        });
        
        // Snap to nearest checkpoint if within threshold
        if (minDistance < 0.5) {
          const targetVideoProgress = nearestCheckpoint.videoTime / maxVideoTime;
          const targetScrollY = targetVideoProgress * (document.body.scrollHeight - window.innerHeight);
          
          window.scrollTo({
            top: targetScrollY,
            behavior: 'smooth'
          });
          
          setActiveSection(nearestCheckpoint.id);
        }
      }, 150);
    };
    
    window.addEventListener("scroll", throttledScroll);
    window.addEventListener("scrollend", handleScrollEnd);
    video?.addEventListener("loadedmetadata", handleVideoLoaded);
    
    // Initialize GSAP animations for sections
    gsap.fromTo("#sectionOne .glassCard", 
      { opacity: 0, y: 50 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1,
        stagger: 0.2,
        scrollTrigger: {
          trigger: "#sectionOne",
          start: "top 80%",
          end: "top 50%",
          scrub: true
        }
      }
    );
    
    gsap.fromTo("#sectionTwo .glassCard",
      { opacity: 0, x: -50 },
      { 
        opacity: 1, 
        x: 0, 
        duration: 1,
        stagger: 0.2,
        scrollTrigger: {
          trigger: "#sectionTwo",
          start: "top 80%",
          end: "top 50%",
          scrub: true
        }
      }
    );
    
    gsap.fromTo("#sectionThree .glassCard",
      { opacity: 0, scale: 0.8 },
      { 
        opacity: 1, 
        scale: 1, 
        duration: 1,
        stagger: 0.2,
        scrollTrigger: {
          trigger: "#sectionThree",
          start: "top 80%",
          end: "top 50%",
          scrub: true
        }
      }
    );
    
    handleScroll();

    return () => {
      window.removeEventListener("scroll", throttledScroll);
      window.removeEventListener("scrollend", handleScrollEnd);
      video?.removeEventListener("loadedmetadata", handleVideoLoaded);
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <>
      <div className="mainScrollingWrapper">
        <div className="backgroundVideo">
          <video 
            ref={videoRef}
            src="https://files.mastersunion.link/uploads/04062026/v1/newVideo.mp4" 
            preload="auto"
            muted
            playsInline
          />
        </div>

        {/* Progress indicator */}
        <div className="progress-indicator">
          <div className="checkpoints">
            {checkpoints.map((checkpoint, index) => (
              <div 
                key={checkpoint.id}
                className={`checkpoint ${activeSection === checkpoint.id ? 'active' : ''}`}
                data-label={checkpoint.label}
              >
                <div className="checkpoint-dot"></div>
                <span className="checkpoint-time">{checkpoint.videoTime}s</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sectionWrapper" ref={sectionWrapperRef}>
          <section className="hero" id="sectionOne">
            <div className="container">
              <div className="innerWrapper">
                <h1>Section 1 - Start</h1>
                <p className="section-description">Video plays from 0s to 3s</p>

                <div className="glassCardsWrapper">
                  <div className="glassCard">
                    <h2>Card 1</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>

                  <div className="glassCard">
                    <h2>Card 2</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>

                  <div className="glassCard">
                    <h2>Card 3</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="hero" id="sectionTwo">
            <div className="container">
              <div className="innerWrapper">
                <h1>Section 2 - First Checkpoint</h1>
                <p className="section-description">Video reaches 3s mark</p>

                <div className="glassCardsWrapper">
                  <div className="glassCard">
                    <h2>Card 1</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>

                  <div className="glassCard">
                    <h2>Card 2</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>

                  <div className="glassCard">
                    <h2>Card 3</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="hero" id="sectionThree">
            <div className="container">
              <div className="innerWrapper">
                <h1>Section 3 - Final Checkpoint</h1>
                <p className="section-description">Video reaches 5s mark</p>

                <div className="glassCardsWrapper">
                  <div className="glassCard">
                    <h2>Card 1</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>

                  <div className="glassCard">
                    <h2>Card 2</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>

                  <div className="glassCard">
                    <h2>Card 3</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}