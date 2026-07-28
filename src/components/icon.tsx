import {
  Ambulance,
  Bed,
  Building,
  Building2,
  Car,
  Droplet,
  Droplets,
  Flame,
  Fuel,
  HeartPulse,
  Home,
  Hospital,
  Laptop,
  Microscope,
  Phone,
  Pill,
  Scale,
  Scissors,
  Shield,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Warehouse,
  Wifi,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '@/data/types'

/**
 * Named registry so the data layer can reference icons as plain strings and
 * stay serialisable — important for the eventual move to a real backend.
 */
const REGISTRY: Record<IconName, LucideIcon> = {
  ambulance: Ambulance,
  hospital: Hospital,
  stethoscope: Stethoscope,
  pill: Pill,
  droplet: Droplet,
  microscope: Microscope,
  'heart-pulse': HeartPulse,
  zap: Zap,
  wrench: Wrench,
  car: Car,
  wind: Wind,
  fuel: Fuel,
  laptop: Laptop,
  smartphone: Smartphone,
  wifi: Wifi,
  droplets: Droplets,
  scale: Scale,
  scissors: Scissors,
  sparkles: Sparkles,
  home: Home,
  building: Building,
  'building-2': Building2,
  store: Store,
  warehouse: Warehouse,
  bed: Bed,
  shield: Shield,
  flame: Flame,
  phone: Phone,
}

export function Icon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: IconName
  className?: string
  strokeWidth?: number
}) {
  const Cmp = REGISTRY[name] ?? Phone
  return <Cmp className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
