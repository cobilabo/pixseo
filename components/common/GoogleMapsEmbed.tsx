'use client';

interface GoogleMapsEmbedProps {
  url: string;
}

export default function GoogleMapsEmbed({ url }: GoogleMapsEmbedProps) {
  // GoogleマイマップのURLを埋め込み用に変換
  const embedUrl = url.replace('/view', '/embed');

  return (
    <div className="relative w-full pb-[56.25%] rounded-lg overflow-hidden border-2 border-gray-200">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={embedUrl}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}



