import { useRef, useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';

const VideoView = () => {
  const videoRef = useRef(null);
  const { ref, inView } = useInView({
    threshold: 0.025,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView && videoRef.current) {
      videoRef.current.play();
    }
  }, [inView]);

  return (
    <div className="relative h-screen flex">
      <motion.video
        ref={videoRef}
        className="w-full h-full object-cover grayscale"
        src="./alive.mp4"
        initial={{ filter: 'grayscale(100%)' }}
        animate={{ filter: inView ? 'grayscale(0%)' : 'grayscale(100%)' }}
        transition={{ duration: 3, delay: 0.1 }}
        loop={true}
        muted
        playsInline
      />
      <div ref={ref} className="absolute bottom-0 h-1/4 w-full"></div>
    </div>
  );
};

export default VideoView;
