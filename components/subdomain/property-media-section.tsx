'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, View } from 'lucide-react';

interface PropertyMediaSectionProps {
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
  propertyName: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function getMatterportId(url: string): string | null {
  const match = url.match(/my\.matterport\.com\/show\/\?m=([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default function PropertyMediaSection({ videoUrl, virtualTourUrl, propertyName }: PropertyMediaSectionProps) {
  if (!videoUrl && !virtualTourUrl) return null;

  const renderVideoEmbed = () => {
    if (!videoUrl) return null;

    const youtubeId = getYouTubeId(videoUrl);
    if (youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={`${propertyName} Video Tour`}
          className="w-full h-full rounded-xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    const vimeoId = getVimeoId(videoUrl);
    if (vimeoId) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={`${propertyName} Video Tour`}
          className="w-full h-full rounded-xl"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Direct video URL
    return (
      <video
        src={videoUrl}
        controls
        className="w-full h-full rounded-xl object-cover"
        title={`${propertyName} Video Tour`}
      >
        Your browser does not support the video tag.
      </video>
    );
  };

  const renderVirtualTourEmbed = () => {
    if (!virtualTourUrl) return null;

    const matterportId = getMatterportId(virtualTourUrl);
    if (matterportId) {
      return (
        <iframe
          src={`https://my.matterport.com/show/?m=${matterportId}`}
          title={`${propertyName} Virtual Tour`}
          className="w-full h-full rounded-xl"
          allowFullScreen
        />
      );
    }

    // Generic iframe for other virtual tour providers
    return (
      <iframe
        src={virtualTourUrl}
        title={`${propertyName} Virtual Tour`}
        className="w-full h-full rounded-xl"
        allowFullScreen
      />
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {videoUrl && (
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Play className="h-5 w-5 text-violet-400" />
              Video Tour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
              {renderVideoEmbed()}
            </div>
          </CardContent>
        </Card>
      )}

      {virtualTourUrl && (
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <View className="h-5 w-5 text-violet-400" />
              3D Virtual Tour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-xl overflow-hidden bg-slate-800">
              {renderVirtualTourEmbed()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
