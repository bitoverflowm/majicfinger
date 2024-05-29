import { useRef, useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';

const VideoView = () => {
  const videoRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
  });
  const [startOffset, setStartOffset] = useState(0);

  useEffect(() => {
    // Calculate startOffset after the component has mounted
    setStartOffset(window.innerHeight / 4);

    const handleScroll = () => {
      // Only start changing scrollY after we've scrolled past 1/4 of the screen height
      const scrolledY = Math.max(window.scrollY - window.innerHeight / 4, 0);
      setScrollY(scrolledY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (inView && videoRef.current) {
      videoRef.current.play();
    }
  }, [inView]);

  const videoStyle = {
    transform: `translateY(${Math.min(scrollY, 150)}px)`,
  };

  return (
    <div className="relative h-screen flex items-center justify-center">
      <motion.video
        ref={videoRef}
        className="w-full h-full object-cover grayscale"
        src="./alive.mp4"
        initial={{ filter: 'grayscale(100%)' }}
        animate={{ filter: inView ? 'grayscale(0%)' : 'grayscale(100%)' }}
        transition={{ duration: 3, delay: 0.2 }}
        loop={true}
        muted
        playsInline
        style={videoStyle}
      />
      <div ref={ref} className="absolute bottom-0 h-1/4 w-full"></div>
    </div>
  );
};

export default VideoView;
