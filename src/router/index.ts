import { createRouter, createWebHistory } from 'vue-router'
import LibraryView from '../pages/LibraryView.vue'
import ReaderView from '../pages/ReaderView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'library',
      component: LibraryView
    },
    {
      path: '/reader/:id',
      name: 'reader',
      component: ReaderView
    }
  ]
})