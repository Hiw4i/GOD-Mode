"use client";

import Image from "next/image";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useRef, useState } from "react";
import type { AmbientTrack } from "@/lib/content";

export function AmbientPlayer({ tracks }: { tracks: AmbientTrack[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const track = tracks[index];

  const selectTrack = async (nextIndex: number, autoplay = true) => {
    const audio = audioRef.current;
    if (!audio) return;
    const normalized = (nextIndex + tracks.length) % tracks.length;
    audio.pause();
    audio.src = tracks[normalized].src;
    audio.load();
    setIndex(normalized);
    if (autoplay) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    }
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src) {
      audio.src = track.src;
      audio.load();
    }
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  return (
    <div className="ambient-player-stage" data-ambient-stage>
      <div className="ambient-player-frame" />
      <div className={`ambient-player${playing ? " is-playing" : ""}`}>
        <Image className="ambient-cover" src={track.cover} alt="" fill sizes="300px" />
        <div className="ambient-player-shade" />
        <span className="ambient-track-name">{track.name}</span>
        <div className="ambient-controls">
          <button className="ambient-control" type="button" aria-label="Previous track" onClick={() => selectTrack(index - 1)}>
            <SkipBack />
          </button>
          <button
            className={`ambient-control ambient-control--play${playing ? " is-playing" : ""}`}
            type="button"
            aria-label={`${playing ? "Pause" : "Play"} ${track.name}`}
            aria-pressed={playing}
            onClick={toggle}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button className="ambient-control" type="button" aria-label="Next track" onClick={() => selectTrack(index + 1)}>
            <SkipForward />
          </button>
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => selectTrack(index + 1)}
      />
    </div>
  );
}
