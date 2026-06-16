export interface NavLink {
  label: string;
  href: string;
}

export interface UserAvatar {
  src: string;
  alt: string;
}

export interface FloatingUser {
  name: string;
  flag: string;
  country: string;
  avatar: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

export interface LiveCountry {
  name: string;
  flag: string;
  count: number;
}

export interface Stat {
  value: string;
  label: string;
  iconName: string;
  color: string;
}

export interface Step {
  number: string;
  iconName: string;
  title: string;
  description: string;
  icon:string;
}

export interface Feature {
  iconName: string;
  title: string;
  description: string;
  color: string;
  bg: string;
}

export interface Testimonial {
  name: string;
  country: string;
  flag: string;
  rating: number;
  text: string;
  avatar: string;
}
