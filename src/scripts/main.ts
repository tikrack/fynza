// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/navigation";
// @ts-ignore
import "swiper/css/pagination";

import "../styles/app.css";

import Swiper from "swiper";
import { Navigation, Pagination } from "swiper/modules";

new Swiper(".swiper", {
  modules: [Navigation, Pagination],

  slidesPerView: 1,
  spaceBetween: 24,

  breakpoints: {
    768: {
      slidesPerView: 2,
      spaceBetween: 24,
    },
    1200: {
      slidesPerView: 3,
      spaceBetween: 32,
    },
  },

  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
});