'use client';
import { Flex, Image } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface LoadingDefaultXstudioProps {
  onLoadingComplete?: () => void;
  duration?: number;
}

export default function LoadingDefaultXstudio({
  onLoadingComplete,
  duration = 0,
}: LoadingDefaultXstudioProps = {}) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const incrementInterval = 50; // Update every 50ms for smooth animation

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 95); // Max 95% to avoid completion before actual loading

      setProgress(newProgress);
    }, incrementInterval);

    // Complete loading after specified duration
    timeoutRef.current = setTimeout(() => {
      setProgress(100);
      // Small delay before calling completion callback
      setTimeout(() => {
        onLoadingComplete?.();
      }, 500);
    }, duration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onLoadingComplete]);

  return (
    <div className="relative !z-0 h-screen overflow-hidde">
      {/* Main Content */}
      <Flex className="relative z-10 h-full justify-center items-center">
        <div className="max-w-md w-full mx-4 px-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <Image width={200} src="/logo.png" alt="logo-xstudio" preview={false} />
          </div>

          {/* Custom Progress Bar */}
          <div className="w-full">
            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4 overflow-visible">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out relative shadow-lg"
                style={{
                  width: `${progress}%`,
                  boxShadow:
                    'rgb(59, 130, 246) 0px 0px 10px, rgb(59, 130, 246) 0px 0px 0px, rgb(59, 125, 246) 0px 0px 1px',
                }}
              >
                {/* Inner glow */}
                <div className="absolute inset-0 bg-blue-400 rounded-full opacity-75 animate-pulse"></div>
              </div>
            </div>

            {/* Progress percentage */}
            <div className="text-center">
              <span className="text-blue-400 font-medium text-sm">{Math.floor(progress)}%</span>
            </div>
          </div>
        </div>
      </Flex>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.75;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
