"use client";

import MuxPlayer from "@mux/mux-player-react";
import { Course, Video } from "@/lib/types";

interface MuxVideoPlayerProps {
  course: Course;
  video: Video;
  onEnded?: () => void;
}

/**
 * Real Mux playback. Used when a video has a genuine Mux playback id
 * (the player page falls back to MockVideoPlayer for placeholder ids).
 */
export function MuxVideoPlayer({ course, video, onEnded }: MuxVideoPlayerProps) {
  return (
    <div className="overflow-hidden rounded-3xl bg-navy-950 shadow-lift ring-1 ring-white/10">
      <MuxPlayer
        playbackId={video.muxPlaybackId}
        streamType="on-demand"
        accentColor="#E0B43C"
        title={video.title}
        metadata={{
          video_id: video.id,
          video_title: video.title,
          video_series: course.title,
        }}
        onEnded={onEnded}
        className="aspect-video w-full"
        style={{ ["--media-object-fit" as string]: "cover" }}
      />
    </div>
  );
}
