/**
 * Types & Data Models for Kemudi.id
 */

export type VehicleType = 'mobil' | 'motor' | 'truk';
export type TransmissionType = 'manual' | 'otomatis';
export type CameraView = 'third_person' | 'cockpit' | 'top_down';

export interface VehicleSpec {
  id: VehicleType;
  name: string;
  category: string;
  description: string;
  color: string;
  accentColor: string;
  topSpeed: number; // km/h
  acceleration: number; // 1-10
  turnRadius: number; // 1-10
  difficulty: 'Mudah' | 'Menengah' | 'Tinggi';
  licenseType: 'SIM A' | 'SIM C' | 'SIM B1';
  transmissionSupport: TransmissionType[];
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  avatarBg: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  graduatesCount: number;
  vehicleTypes: VehicleType[];
  specialty: string;
  bio: string;
  location: string;
}

export interface CoursePackage {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice: number;
  duration: string;
  sessionsCount: number;
  isPopular?: boolean;
  features: string[];
  vehicleType: VehicleType;
  simulatorAccessDays: number;
}

export type ModuleCategory = 'UMUM' | 'MOTOR' | 'MOBIL' | 'TRUK';

export interface TrafficSign {
  code: string;
  name: string;
  type: 'Peringatan' | 'Larangan' | 'Perintah' | 'Petunjuk';
  svgType: string;
  meaning: string;
}

export interface TheoryModule {
  id: string;
  slug: string;
  title: string;
  category: ModuleCategory;
  readTimeMinutes: number;
  summary: string;
  sections: {
    heading: string;
    content: string[];
    tips?: string[];
    signs?: TrafficSign[];
  }[];
}

export interface SimulationResult {
  id: string;
  date: string;
  vehicleType: VehicleType;
  transmission: TransmissionType;
  score: number; // 0 - 100
  passed: boolean;
  durationSeconds: number;
  violationsCount: number;
  offRoadCount: number;
  obstacleHits: number;
  violationDetails: string[];
}

export interface StudentProfile {
  name: string;
  email: string;
  phone: string;
  nik: string;
  address: string;
  registeredCourseId?: string;
  selectedMentorId?: string;
  paymentMethod?: 'qris' | 'bca' | 'bni' | 'cash';
  paymentStatus: 'belum_bayar' | 'menunggu_verifikasi' | 'terverifikasi';
  registrationDate?: string;
}

export interface SimulationControls {
  gas: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
  clutch: boolean;
}

export interface DrivingTelemetry {
  speed: number; // km/h
  rpm: number; // 0 - 7000
  gear: number; // -1 = R, 0 = N, 1-6 = gears
  engineOn: boolean;
  seatbelt: boolean;
  mirrorsAdjusted: boolean;
  handbrakeActive: boolean;
  clutchActive: boolean;
  headlights: boolean;
  highBeam: boolean;
  hazard: boolean;
  indicatorLeft: boolean;
  indicatorRight: boolean;
  horn: boolean;
  elapsedSeconds: number;
  violationsCount: number;
  offRoadCount: number;
  obstacleHits: number;
  activeWarning: string | null;
  cameraView: CameraView;
  progressPercent: number; // 0 - 100 on the course
}
