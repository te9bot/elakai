import { ResourceForm } from '@/components/admin/resource-form'
import { ResourceList } from '@/components/admin/resource-list'
import {
  businessForm,
  businessesList,
  categoryBarForm,
  categoryBarList,
  doctorForm,
  doctorsList,
  emergencyForm,
  emergencyList,
  facilitiesList,
  facilityForm,
  rentalForm,
  rentalsList,
} from './resources'

/**
 * Every directory screen, mounted from a descriptor.
 *
 * Grouped into one module so they share a single lazy chunk — ten separate
 * imports would mean ten round trips while an admin moves between sections.
 */

export function FacilitiesListPage() {
  return <ResourceList config={facilitiesList} />
}
export function FacilityFormPage() {
  return <ResourceForm config={facilityForm} />
}

export function DoctorsListPage() {
  return <ResourceList config={doctorsList} />
}
export function DoctorFormPage() {
  return <ResourceForm config={doctorForm} />
}

export function BusinessesListPage() {
  return <ResourceList config={businessesList} />
}
export function BusinessFormPage() {
  return <ResourceForm config={businessForm} />
}

export function RentalsListPage() {
  return <ResourceList config={rentalsList} />
}
export function RentalFormPage() {
  return <ResourceForm config={rentalForm} />
}

export function EmergencyListPage() {
  return <ResourceList config={emergencyList} />
}
export function EmergencyFormPage() {
  return <ResourceForm config={emergencyForm} />
}

export function CoverageListPage() {
  return <ResourceList config={categoryBarList} />
}
export function CoverageFormPage() {
  return <ResourceForm config={categoryBarForm} />
}
