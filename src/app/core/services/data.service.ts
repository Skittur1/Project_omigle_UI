/**
 * Angular version of DataService — copy this as `data.service.ts` into your Angular project.
 * Wraps the same data in an @Injectable service consumable via inject().
 */
import { Injectable } from '@angular/core';
import type {
  NavLink, UserAvatar, FloatingUser, LiveCountry,
  Stat, Step, Feature, Testimonial,
} from '../models/index';
import { from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  footerSocialPlatforms = ['FB', 'TW', 'IG', 'YT'];

  readonly navLinks: NavLink[] = [
    { label: 'Home', href: '#' },
    { label: 'Features', href: '#features' },
    { label: 'Safety', href: '#safety' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Blog', href: '#blog' },
    { label: 'About Us', href: '#about' },
  ];

  readonly onlineUserAvatars: UserAvatar[] = [
    { src: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', alt: 'User 1' },
    { src: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', alt: 'User 2' },
    { src: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', alt: 'User 3' },
    { src: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', alt: 'User 4' },
    { src: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', alt: 'User 5' },
  ];
  

  readonly floatingUsers: FloatingUser[] = [
    { name: 'Sophia', flag: '🇺🇸', country: 'USA', top: '8%', left: '28%',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
    { name: 'Noah', flag: '🇦🇺', country: 'Australia', top: '18%', right: '4%',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
    { name: 'Liam', flag: '🇬🇧', country: 'UK', top: '42%', left: '0%',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
    { name: 'Emma', flag: '🇨🇦', country: 'Canada', bottom: '22%', left: '18%',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
    { name: 'Olivia', flag: '🇧🇷', country: 'Brazil', bottom: '20%', right: '6%',
      avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' },
  ];
  premiumFeatures = [
  {
    iconName: 'video',
    title: 'HD Video Chat',
    description: 'Crystal clear video calls.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10'
  },
  {
    iconName: 'message-circle',
    title: 'Instant Messaging',
    description: 'Fast and secure chats.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10'
  },
  {
    iconName: 'globe',
    title: 'Global Reach',
    description: 'Connect worldwide.',
    color: 'text-green-400',
    bg: 'bg-green-500/10'
  }
];

  readonly liveCountries: LiveCountry[] = [
    { name: 'India', flag: '🇮🇳', count: 12450 },
    { name: 'United States', flag: '🇺🇸', count: 8240 },
    { name: 'Brazil', flag: '🇧🇷', count: 4900 },
    { name: 'United Kingdom', flag: '🇬🇧', count: 3110 },
    { name: 'Canada', flag: '🇨🇦', count: 2780 },
  ];

  readonly stats: Stat[] = [
    { value: '52,341+', label: 'Users Online', iconName: 'users', color: 'stat-violet' },
    { value: '2.8M+', label: 'Chats This Month', iconName: 'message-circle', color: 'stat-blue' },
    { value: '150+', label: 'Countries Connected', iconName: 'globe', color: 'stat-cyan' },
    { value: '99.9%', label: 'Uptime Guarantee', iconName: 'shield', color: 'stat-green' },
  ];

  readonly steps: Step[] = [
    { number: '1', iconName: 'hand', title: 'Choose Your Mode', description: 'Select video or text chat to start your journey.',icon:'hand' },
    { number: '2', iconName: 'users', title: 'Get Matched', description: "We'll connect you with someone instantly.",icon:'hand'  },
    { number: '3', iconName: 'message-square', title: 'Start Chatting', description: 'Enjoy your conversation and make new friends.' ,icon:'hand' },
  ];

  readonly features: Feature[] = [
    { iconName: 'video', title: 'HD Video Chat', description: 'Crystal clear video calls', color: 'feat-violet', bg: 'feat-bg-violet' },
    { iconName: 'message-circle', title: 'Instant Messaging', description: 'Chat instantly before or during video calls', color: 'feat-blue', bg: 'feat-bg-blue' },
    { iconName: 'globe', title: 'Global Matching', description: 'Connect with people from different countries', color: 'feat-cyan', bg: 'feat-bg-cyan' },
    { iconName: 'star', title: 'Interest Based', description: 'Match with people who share your interests', color: 'feat-yellow', bg: 'feat-bg-yellow' },
    { iconName: 'lock', title: 'Private & Secure', description: 'Your privacy is our top priority', color: 'feat-green', bg: 'feat-bg-green' },
    { iconName: 'shield-off', title: 'Report & Block', description: 'Report users and block instantly', color: 'feat-red', bg: 'feat-bg-red' },
  ];

  readonly testimonials: Testimonial[] = [
    { name: 'Sophia Martin', country: 'Canada', flag: '🇨🇦', rating: 5,
      text: "I've met so many amazing people from different countries. Omilge is the best place to make new friends!",
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' },
    { name: 'James Williams', country: 'Australia', flag: '🇦🇺', rating: 4,
      text: 'The video quality is awesome and its so easy to use. I love the instant matching feature!',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' },
    { name: 'Olivia Brown', country: 'United Kingdom', flag: '🇬🇧', rating: 5,
      text: 'Finally a platform that is both fun and safe. I feel comfortable and enjoy every chat.',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' },
  ];

  readonly ctaAvatars: UserAvatar[] = [
    { src: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop', alt: 'User 1' },
    { src: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop', alt: 'User 2' },
    { src: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop', alt: 'User 3' },
  ];

  readonly footerQuickLinks = ['Home', 'Safety', 'Features', 'How It Works', 'Blog', 'About Us'];
  readonly footerInfoLinks = ['Safety', 'Community Guidelines', 'Privacy Policy', 'Terms of Service', 'FAQs'];
  readonly footerSupportLinks = ['Help Center', 'Contact Support', 'Report a Problem', 'Feedback'];
  readonly footerSocials = ['D', 'I', 'T', 'Y'];
}
