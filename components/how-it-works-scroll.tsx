"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Terminal, Zap, MessageCircle, Mouse, ArrowRight } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS_DATA = [
  {
    stepNum: "01",
    title: "Comment",
    tag: "INBOUND TRIGGER",
    desc: "Audience members trigger the system directly via high-intent feed interactions.",
    telemetry: { event: "INCOMING_COMMENT", latency: "< 84ms" },
    icon: <MessageCircle className="w-6 h-6 text-indigo-400" />,
    color: "indigo"
  },
  {
    stepNum: "02",
    title: "Match",
    tag: "LOGIC EVALUATION",
    desc: "Worker matches incoming tokens against campaign rules and verifies follow-gate.",
    telemetry: { event: "RULE_EVALUATION", latency: "< 42ms" },
    icon: <Terminal className="w-6 h-6 text-purple-400" />,
    color: "purple"
  },
  {
    stepNum: "03",
    title: "Deliver",
    tag: "DISPATCH ENGINE",
    desc: "Sub-second direct message arrives in the inbox with a trackable link.",
    telemetry: { event: "DISPATCH_DM", latency: "0.8s TOTAL" },
    icon: <Zap className="w-6 h-6 text-emerald-400" />,
    color: "emerald"
  },
];

export function HowItWorksScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const glowLineRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current || !trackRef.current) return;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const trackWidth = trackRef.current!.scrollWidth;
      const viewportWidth = window.innerWidth;
      
      if (trackWidth <= viewportWidth) return;
      
      const distanceToTranslate = trackWidth - viewportWidth + 300;

      // We will handle card highlights dynamically based on viewport center
      // so only the card exactly in the middle of the screen lights up.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "center center",
          end: `+=${distanceToTranslate * 1.8}`, 
          pin: true,
          scrub: 1, 
          anticipatePin: 1,
          onUpdate: () => {
            const viewportCenter = window.innerWidth / 2;
            
            cardsRef.current.forEach((card) => {
              if (!card) return;
              const rect = card.getBoundingClientRect();
              const cardCenter = rect.left + rect.width / 2;
              const distance = Math.abs(cardCenter - viewportCenter);
              
              // If the card is near the center of the screen, light it up
              if (distance < 450) {
                gsap.to(card, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.4, overwrite: "auto" });
              } else {
                // Otherwise, dim it out
                gsap.to(card, { opacity: 0.2, scale: 0.9, filter: "blur(6px)", duration: 0.4, overwrite: "auto" });
              }
            });
          }
        }
      });

      // 1. Move track horizontally
      tl.to(trackRef.current, {
        x: -distanceToTranslate,
        ease: "none"
      }, 0);

      // 2. Fill middle line
      tl.to(glowLineRef.current, {
        scaleX: 1,
        ease: "none"
      }, 0);
    });

    return () => mm.revert();
  }, []);

  return (
    <div className="gsap-pin-wrapper">
      <section 
        ref={sectionRef} 
        id="how-it-works" 
        className="w-full h-screen bg-[#020202] relative overflow-hidden flex flex-col justify-center border-y border-white/[0.02]"
      >
        {/* Deep ambient background glows */}
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-0 right-[20%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Center Title - Ultra faint watermark style */}
        <div className="absolute top-1/2 left-[5vw] -translate-y-1/2 z-0 opacity-[0.02] pointer-events-none hidden md:block">
          <h2 className="text-[18vw] font-black tracking-tighter text-white whitespace-nowrap select-none">
            WORKFLOW
          </h2>
        </div>

        {/* Sticky Header */}
        <div className="absolute top-12 left-6 md:left-20 z-20">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs text-indigo-400 uppercase tracking-widest font-bold">
              Mechanical Flow
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90">
            How the engine fires
          </h2>
        </div>

        {/* The Horizontal Scroll Track */}
        <div className="hidden md:block absolute inset-0 top-1/2 -translate-y-1/2 h-[550px]">
          
          {/* Top Line Boundary */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
          {/* Bottom Line Boundary */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />

          {/* Glowing Center Line that fills on scroll */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 -translate-y-1/2 z-0" />
          <div 
            ref={glowLineRef}
            className="absolute top-1/2 left-0 w-[200vw] h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 -translate-y-1/2 z-0 origin-left scale-x-0 shadow-[0_0_20px_rgba(168,85,247,0.8)]" 
          />

          {/* Track Container */}
          <div ref={trackRef} className="relative z-20 h-full w-max flex items-center pl-[calc(50vw-64px)] pr-[55vw] gap-[15vw]">
            
            {/* Scroll Indicator Circle */}
            <div 
              ref={(el) => { cardsRef.current[3] = el; }} 
              className="w-32 h-32 shrink-0 bg-white/[0.02] border border-white/20 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.05)] backdrop-blur-2xl transition-all duration-700 relative z-20 self-center group"
            >
              <div className="absolute inset-[-10px] rounded-full border border-white/10 animate-[spin_4s_linear_infinite] border-t-white/40" />
              <div className="absolute top-1/2 right-[-20px] w-4 h-4 rounded-full bg-white border border-white/20 -translate-y-1/2 z-20 shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
              <div className="text-white/80 mb-2">
                <Mouse className="w-5 h-5 animate-bounce" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/90">Scroll</span>
            </div>

            {STEPS_DATA.map((step, i) => {
              const isTop = i % 2 === 0;
              const colorMap: Record<string, string> = {
                indigo: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]",
                purple: "text-purple-400 border-purple-500/20 bg-purple-500/5 group-hover:border-purple-500/50 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]",
                emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]"
              };
              const dotGlowMap: Record<string, string> = {
                indigo: "shadow-[0_0_15px_rgba(99,102,241,1)] bg-indigo-400",
                purple: "shadow-[0_0_15px_rgba(168,85,247,1)] bg-purple-400",
                emerald: "shadow-[0_0_15px_rgba(16,185,129,1)] bg-emerald-400"
              };

              return (
                <div 
                  key={step.stepNum} 
                  ref={(el) => { cardsRef.current[i] = el; }}
                  className={`w-[420px] shrink-0 bg-[#050505]/80 border border-white/5 rounded-[2rem] p-8 flex flex-col shadow-2xl backdrop-blur-2xl group transition-all duration-700 hover:-translate-y-2 relative z-20 opacity-20 scale-90 blur-[6px] ${isTop ? 'self-start mt-0' : 'self-end mb-0'} ${colorMap[step.color]}`}
                >
                  {/* Connection Node (Dot) to the middle line */}
                  <div className="absolute top-1/2 left-[210px] w-[1px] h-[1000px] bg-white/5 -z-10 hidden" />
                  
                  {/* Massive background number */}
                  <div className="absolute top-6 right-8 text-[100px] font-black text-white/[0.03] pointer-events-none leading-none select-none tracking-tighter transition-all duration-700 group-hover:text-white/[0.08] group-hover:scale-110 group-hover:-translate-y-4">
                    {step.stepNum}
                  </div>

                  <div className="mb-6 relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-inner ${colorMap[step.color].split(' ')[0]}`}>
                        {step.icon}
                      </div>
                      <div className={`text-[10px] uppercase tracking-widest font-bold ${colorMap[step.color].split(' ')[0]}`}>
                        {step.tag}
                      </div>
                    </div>
                    
                    <h3 className="text-3xl text-white font-bold tracking-tight mb-3">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-sm">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider">EVENT: <span className="text-white font-semibold">{step.telemetry.event}</span></span>
                    <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded bg-black border border-white/5 ${colorMap[step.color].split(' ')[0]}`}>
                      {step.telemetry.latency}
                    </span>
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* MOBILE FALLBACK (Vertical layout) */}
        <div className="md:hidden px-6 py-24 relative z-10 space-y-6 overflow-y-auto h-full mt-16">
          {STEPS_DATA.map((step) => (
            <div key={step.stepNum} className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[60px] font-black text-white/[0.03] pointer-events-none leading-none select-none tracking-tighter">
                {step.stepNum}
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  {step.icon}
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${step.color === 'indigo' ? 'text-indigo-400' : step.color === 'purple' ? 'text-purple-400' : 'text-emerald-400'}`}>{step.tag}</div>
                </div>
                <div className="text-2xl font-bold text-white mb-2">{step.title}</div>
                <p className="text-sm text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
