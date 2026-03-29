import React, { useEffect, useState } from 'react';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';

import budgetkillerVid from '/media/budgetkiller.mp4';
import gamingguruVid from '/media/gaming guru.mp4';
import cameraVid from '/media/camera.mp4';
import battryVid from '/media/battry.mp4';
import goatVid from '/media/goat.mp4';

const CATEGORY_ROUTES = {
  '/budget-killer': {
    pageKey: 'budget-killer',
    title: 'Budget Killer',
    subtitle: 'Best value picks under tight budgets with balanced real-world performance.',
    description: 'Budget Killer focuses on phones that deliver strong day-to-day speed, dependable battery life, and reliable software support without inflating price.',
    videoSrc: budgetkillerVid,
    highlights: ['Performance per rupee', 'Display quality in budget tier', 'Thermals under sustained load', 'Software and update policy'],
  },
  '/gaming-guru': {
    pageKey: 'gaming-guru',
    title: 'Gaming Guru',
    subtitle: 'High FPS consistency, thermal control, and low-latency touch for competitive play.',
    description: 'Gaming Guru highlights devices that keep frame rates stable over long sessions, avoid thermal throttling, and provide responsive controls.',
    videoSrc: gamingguruVid,
    highlights: ['Sustained FPS stability', 'Vapor chamber and cooling efficiency', 'Touch sampling and response rate', 'Battery drain during extended gaming'],
  },
  '/camera-champ': {
    pageKey: 'camera-champ',
    title: 'Camera Champ',
    subtitle: 'Balanced photography systems with true-to-life color, dynamic range, and detail.',
    description: 'Camera Champ recommends phones that perform consistently across daylight, night mode, portraits, and video stabilization.',
    videoSrc: cameraVid,
    highlights: ['Main sensor consistency', 'Low-light and night capture', 'Portrait edge detection', 'Video stabilization and audio'],
  },
  '/battery-boss': {
    pageKey: 'battery-boss',
    title: 'Battery Boss',
    subtitle: 'Endurance-focused devices made for heavy users and all-day confidence.',
    description: 'Battery Boss ranks phones by real screen-on endurance, efficiency tuning, and fast charging behavior under practical usage patterns.',
    videoSrc: battryVid,
    highlights: ['Screen-on time under mixed use', 'Standby drain efficiency', 'Charging speed consistency', 'Battery health management'],
  },
  '/goat': {
    pageKey: 'goat',
    title: 'G.O.A.T',
    subtitle: 'Flagship-grade excellence with no compromise across performance, camera, and build.',
    description: 'G.O.A.T showcases top-tier smartphones that lead in raw capability, refinement, and premium overall user experience.',
    videoSrc: goatVid,
    highlights: ['Flagship chip and sustained speed', 'Best-in-class imaging', 'Display and haptics quality', 'Long-term software support'],
  },
};

function App() {
  const getCurrentRoute = () => {
    const pathname = window.location.pathname.toLowerCase();
    const hashRoute = window.location.hash.startsWith('#/')
      ? window.location.hash.slice(1).toLowerCase()
      : '/';

    return hashRoute || pathname;
  };

  const [currentRoute, setCurrentRoute] = useState(getCurrentRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(getCurrentRoute());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const pageData = CATEGORY_ROUTES[currentRoute] || CATEGORY_ROUTES[window.location.pathname.toLowerCase()];

  useEffect(() => {
    const pageKey = pageData?.pageKey || 'home';
    document.body.setAttribute('data-page', pageKey);

    return () => {
      document.body.removeAttribute('data-page');
    };
  }, [pageData]);

  if (pageData) {
    return <CategoryPage {...pageData} />;
  }

  return <Home />;
}

export default App;
