import React, { useEffect, useRef } from 'react';
import { createApp, h } from 'vue';
import { createRouter, createWebHashHistory, type RouteRecordRaw, RouterView } from 'vue-router';
import App from './App';
import HomePage from './pages/HomePage/HomePage';
import MenuPage from './pages/MenuPage/MenuPage';
import OrderPage from './pages/OrderPage/OrderPage';
import CartPage from './pages/CartPage/CartPage';
import DishDetailPage from './pages/DishDetailPage/DishDetailPage';
import SmartRecommendPage from './pages/SmartRecommendPage/SmartRecommendPage';
import NotFound from './pages/NotFound';
import './index.css';

const CLIENT_BASE_PATH =
  (typeof window !== 'undefined' && (window as any).__BASENAME__) ||
  (import.meta as any).env?.VITE_CLIENT_BASE_PATH ||
  '/';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: App,
    children: [
      { path: '', component: HomePage },
      { path: 'menu', component: MenuPage },
      { path: 'order', component: OrderPage },
      { path: 'cart', component: CartPage },
      { path: 'recommend', component: SmartRecommendPage },
      { path: 'dish/:id', component: DishDetailPage },
    ],
  },
  { path: '/:pathMatch(.*)*', component: NotFound },
];

const RoutesComponent = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const router = createRouter({
      history: createWebHashHistory(CLIENT_BASE_PATH),
      routes,
      scrollBehavior() {
        return { top: 0 };
      },
    });

    const app = createApp({ render: () => h(RouterView) });
    app.use(router);
    app.mount(containerRef.current);

    return () => {
      app.unmount();
    };
  }, []);

  return <div ref={containerRef} />;
};

export default RoutesComponent;
