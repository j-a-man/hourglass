# PharmaClock - Production-Ready Implementation Plan

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Design System (Deel-Inspired)](#design-system-deel-inspired)
3. [Architecture Redesign](#architecture-redesign)
4. [Feature Specifications](#feature-specifications)
5. [Technical Implementation](#technical-implementation)
6. [Security & Compliance](#security--compliance)
7. [Deployment & DevOps](#deployment--devops)
8. [Testing Strategy](#testing-strategy)
9. [Phase Rollout Plan](#phase-rollout-plan)

---

## Executive Summary

PharmaClock is being redesigned as an enterprise-grade time tracking and payroll management system for pharmacy operations. This implementation plan transforms the current MVP into a production-ready application with:

- **Location-based clock-in/out** with geofencing and IP verification
- **Automated bi-weekly payroll CSV generation** with overtime calculations
- **Admin dashboard** with real-time analytics and employee management
- **Mobile-first responsive design** with progressive web app (PWA) capabilities
- **Deel-inspired UI/UX** for modern, trustworthy, and scalable interface

### MVP Core Requirements
1. ✅ Employees can only clock in/out at designated pharmacy locations
2. ✅ Automated bi-weekly payroll CSV exports with earnings breakdown
3. ✅ Admin dashboard with employee oversight and schedule management
4. ✅ Real-time attendance tracking and shift verification
5. ✅ Mobile-responsive design for on-the-go access

### Additional Enhanced Features
6. Break time tracking with compliance alerts
7. Shift swap and time-off request system
8. Multi-location support for pharmacy chains
9. Overtime and holiday pay calculations
10. Employee performance metrics and attendance reports
11. Push notifications for shift reminders and approvals
12. Integration with accounting software (QuickBooks, Xero)
13. Audit logs and compliance reporting
14. Role-based permissions (Owner, Manager, Pharmacist, Technician)

---

## Design System (Deel-Inspired)

### Design Philosophy
Deel's design emphasizes **trust, clarity, and global scalability**. Key principles:
- Clean, uncluttered interfaces with generous white space
- Modern sans-serif typography for digital fluency
- Strategic use of color for hierarchy and emotional impact
- Abstract illustrations balanced with real data visualization
- Microinteractions for polish and user feedback

### Design Tokens (JSON Format)

```json
{
  "designSystem": {
    "name": "PharmaClock Design System",
    "version": "1.0.0",
    "colors": {
      "primary": {
        "50": "#EFF6FF",
        "100": "#DBEAFE",
        "200": "#BFDBFE",
        "300": "#93C5FD",
        "400": "#60A5FA",
        "500": "#3B82F6",
        "600": "#2563EB",
        "700": "#1D4ED8",
        "800": "#1E40AF",
        "900": "#1E3A8A"
      },
      "secondary": {
        "50": "#F0FDFA",
        "100": "#CCFBF1",
        "200": "#99F6E4",
        "300": "#5EEAD4",
        "400": "#2DD4BF",
        "500": "#14B8A6",
        "600": "#0D9488",
        "700": "#0F766E",
        "800": "#115E59",
        "900": "#134E4A"
      },
      "accent": {
        "yellow": "#FBBF24",
        "purple": "#A855F7",
        "pink": "#EC4899"
      },
      "neutral": {
        "50": "#F9FAFB",
        "100": "#F3F4F6",
        "200": "#E5E7EB",
        "300": "#D1D5DB",
        "400": "#9CA3AF",
        "500": "#6B7280",
        "600": "#4B5563",
        "700": "#374151",
        "800": "#1F2937",
        "900": "#111827"
      },
      "semantic": {
        "success": "#10B981",
        "warning": "#F59E0B",
        "error": "#EF4444",
        "info": "#3B82F6"
      }
    },
    "typography": {
      "fontFamily": {
        "sans": "Inter, system-ui, -apple-system, sans-serif",
        "mono": "JetBrains Mono, monospace"
      },
      "fontSize": {
        "xs": "0.75rem",
        "sm": "0.875rem",
        "base": "1rem",
        "lg": "1.125rem",
        "xl": "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
        "6xl": "3.75rem"
      },
      "fontWeight": {
        "light": 300,
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      },
      "lineHeight": {
        "tight": 1.25,
        "normal": 1.5,
        "relaxed": 1.75
      }
    },
    "spacing": {
      "0": "0",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "16": "4rem",
      "20": "5rem",
      "24": "6rem"
    },
    "borderRadius": {
      "none": "0",
      "sm": "0.125rem",
      "base": "0.375rem",
      "md": "0.5rem",
      "lg": "0.75rem",
      "xl": "1rem",
      "2xl": "1.5rem",
      "full": "9999px"
    },
    "shadows": {
      "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "base": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    },
    "animation": {
      "duration": {
        "fast": "150ms",
        "base": "300ms",
        "slow": "500ms"
      },
      "easing": {
        "easeIn": "cubic-bezier(0.4, 0, 1, 1)",
        "easeOut": "cubic-bezier(0, 0, 0.2, 1)",
        "easeInOut": "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    },
    "breakpoints": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px",
      "2xl": "1536px"
    }
  },
  "components": {
    "button": {
      "variants": {
        "primary": {
          "background": "primary.600",
          "color": "white",
          "hover": "primary.700",
          "active": "primary.800"
        },
        "secondary": {
          "background": "secondary.600",
          "color": "white",
          "hover": "secondary.700",
          "active": "secondary.800"
        },
        "outline": {
          "background": "transparent",
          "border": "neutral.300",
          "color": "neutral.700",
          "hover": "neutral.50"
        },
        "ghost": {
          "background": "transparent",
          "color": "neutral.700",
          "hover": "neutral.100"
        }
      },
      "sizes": {
        "sm": {
          "padding": "0.5rem 1rem",
          "fontSize": "sm"
        },
        "md": {
          "padding": "0.75rem 1.5rem",
          "fontSize": "base"
        },
        "lg": {
          "padding": "1rem 2rem",
          "fontSize": "lg"
        }
      }
    },
    "card": {
      "base": {
        "background": "white",
        "borderRadius": "lg",
        "shadow": "md",
        "padding": "1.5rem"
      }
    },
    "input": {
      "base": {
        "borderRadius": "md",
        "border": "neutral.300",
        "padding": "0.75rem 1rem",
        "fontSize": "base",
        "focus": {
          "border": "primary.500",
          "ring": "primary.200"
        }
      }
    }
  }
}
```

### UI Component Specifications

#### Landing Page Structure (Deel-Inspired)
```json
{
  "landingPage": {
    "hero": {
      "headline": "Time Tracking That Respects Your Team's Time",
      "subheadline": "Modern pharmacy payroll management with location-verified clock-ins, automated calculations, and real-time insights.",
      "cta": {
        "primary": "Start Free Trial",
        "secondary": "Book a Demo"
      },
      "visualElements": [
        "Abstract pharmacy shapes (mortar, pestle, pill bottles)",
        "Animated dashboard preview",
        "Trust indicators (customer logos, testimonials)"
      ],
      "layout": "60% content / 40% visual split on desktop"
    },
    "features": {
      "sections": [
        {
          "title": "Location-Verified Clock-Ins",
          "description": "Ensure employees are on-site with GPS geofencing and IP verification. Prevent time theft and buddy punching.",
          "icon": "MapPin",
          "visual": "Interactive map showing geofence radius"
        },
        {
          "title": "Automated Payroll Export",
          "description": "Generate bi-weekly payroll CSVs with one click. Includes overtime, breaks, and deductions automatically calculated.",
          "icon": "FileSpreadsheet",
          "visual": "Animated CSV generation flow"
        },
        {
          "title": "Real-Time Dashboard",
          "description": "See who's clocked in, track hours, and monitor attendance patterns. Beautiful insights that make sense.",
          "icon": "BarChart3",
          "visual": "Live dashboard preview with metrics"
        },
        {
          "title": "Mobile-First Design",
          "description": "Clock in from any device. Our PWA works seamlessly on phones, tablets, and desktops.",
          "icon": "Smartphone",
          "visual": "Device mockups showing responsive design"
        }
      ],
      "layout": "Alternating left-right layout with ample white space"
    },
    "socialProof": {
      "testimonials": [
        {
          "quote": "PharmaClock saved us 10+ hours per pay period on payroll processing.",
          "author": "Sarah Johnson",
          "role": "Pharmacy Manager",
          "company": "Corner Pharmacy"
        }
      ],
      "stats": [
        {
          "value": "99.9%",
          "label": "Clock-in accuracy"
        },
        {
          "value": "10hrs",
          "label": "Saved per month"
        },
        {
          "value": "500+",
          "label": "Pharmacies trust us"
        }
      ]
    },
    "pricing": {
      "tiers": [
        {
          "name": "Starter",
          "price": "$29/month",
          "description": "For single-location pharmacies",
          "features": [
            "Up to 10 employees",
            "Location verification",
            "Basic reporting",
            "Email support"
          ]
        },
        {
          "name": "Professional",
          "price": "$79/month",
          "description": "For growing pharmacy operations",
          "features": [
            "Up to 50 employees",
            "Multi-location support",
            "Advanced analytics",
            "Priority support",
            "API access"
          ],
          "highlighted": true
        },
        {
          "name": "Enterprise",
          "price": "Custom",
          "description": "For pharmacy chains",
          "features": [
            "Unlimited employees",
            "Dedicated support",
            "Custom integrations",
            "SLA guarantees",
            "White-label options"
          ]
        }
      ]
    },
    "footer": {
      "sections": [
        {
          "title": "Product",
          "links": ["Features", "Pricing", "Integrations", "Security"]
        },
        {
          "title": "Resources",
          "links": ["Documentation", "API Reference", "Support", "Status"]
        },
        {
          "title": "Company",
          "links": ["About", "Blog", "Careers", "Contact"]
        },
        {
          "title": "Legal",
          "links": ["Privacy", "Terms", "HIPAA Compliance"]
        }
      ]
    }
  }
}
```

---

## Architecture Redesign

### Technology Stack (Updated)

```json
{
  "frontend": {
    "framework": "Next.js 15 App Router",
    "language": "TypeScript 5.3+",
    "styling": {
      "base": "Tailwind CSS 4.0",
      "components": "Shadcn UI (Radix Primitives)",
      "animations": "Framer Motion 11"
    },
    "stateManagement": [
      "React Context (auth, user preferences)",
      "TanStack Query v5 (server state)",
      "Zustand (global UI state)"
    ],
    "formHandling": "React Hook Form + Zod",
    "dateHandling": "date-fns",
    "charts": "Recharts",
    "maps": "Mapbox GL JS",
    "pwa": "next-pwa"
  },
  "backend": {
    "primary": "Firebase",
    "services": {
      "auth": "Firebase Authentication",
      "database": "Firestore (primary)",
      "storage": "Firebase Storage (files, photos)",
      "functions": "Firebase Cloud Functions (v2)",
      "hosting": "Firebase Hosting (fallback)"
    },
    "edge": {
      "platform": "Vercel Edge Functions",
      "runtime": "Node.js 20"
    }
  },
  "infrastructure": {
    "hosting": "Vercel (primary)",
    "cdn": "Vercel Edge Network",
    "monitoring": {
      "errors": "Sentry",
      "analytics": "Vercel Analytics + Plausible",
      "performance": "Vercel Speed Insights"
    },
    "cicd": "GitHub Actions + Vercel",
    "backups": "Firebase automated backups"
  },
  "integrations": {
    "geolocation": "HTML5 Geolocation API + IP Geolocation API",
    "notifications": "Firebase Cloud Messaging (FCM)",
    "email": "Resend API",
    "sms": "Twilio (optional)",
    "accounting": ["QuickBooks API", "Xero API"],
    "calendar": "Google Calendar API"
  }
}
```

### Project Structure (Revised)

```
pharmaclock/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (marketing)/
│   │   ├── page.tsx                    # Landing page
│   │   ├── features/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx            # Overview
│   │   │   │   ├── employees/
│   │   │   │   │   ├── page.tsx        # Employee list
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx    # Employee details
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx    # Add employee
│   │   │   │   ├── schedule/
│   │   │   │   │   └── page.tsx        # Calendar view
│   │   │   │   ├── locations/
│   │   │   │   │   ├── page.tsx        # Location management
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx    # Location details
│   │   │   │   ├── payroll/
│   │   │   │   │   ├── page.tsx        # Payroll dashboard
│   │   │   │   │   └── [periodId]/
│   │   │   │   │       └── page.tsx    # Pay period details
│   │   │   │   ├── reports/
│   │   │   │   │   ├── page.tsx        # Reports hub
│   │   │   │   │   ├── attendance/
│   │   │   │   │   ├── hours/
│   │   │   │   │   └── export/
│   │   │   │   ├── time-off/
│   │   │   │   │   └── page.tsx        # Manage requests
│   │   │   │   ├── settings/
│   │   │   │   │   ├── page.tsx        # Company settings
│   │   │   │   │   ├── users/
│   │   │   │   │   ├── billing/
│   │   │   │   │   └── integrations/
│   │   │   │   └── layout.tsx
│   │   │   ├── employee/
│   │   │   │   ├── page.tsx            # Clock in/out
│   │   │   │   ├── schedule/
│   │   │   │   │   └── page.tsx        # My schedule
│   │   │   │   ├── hours/
│   │   │   │   │   └── page.tsx        # Hours log
│   │   │   │   ├── time-off/
│   │   │   │   │   └── page.tsx        # Request time off
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx        # Profile settings
│   │   │   │   └── layout.tsx
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── clock/
│   │   │   ├── in/
│   │   │   │   └── route.ts
│   │   │   └── out/
│   │   │       └── route.ts
│   │   ├── geolocation/
│   │   │   ├── verify/
│   │   │   │   └── route.ts
│   │   │   └── update/
│   │   │       └── route.ts
│   │   ├── payroll/
│   │   │   ├── generate/
│   │   │   │   └── route.ts
│   │   │   └── export/
│   │   │       └── route.ts
│   │   ├── notifications/
│   │   │   └── send/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       └── [...path]/
│   │           └── route.ts
│   ├── layout.tsx                      # Root layout
│   ├── global.css
│   └── not-found.tsx
├── components/
│   ├── ui/                             # Shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   └── mobile-nav.tsx
│   ├── auth/
│   │   ├── auth-provider.tsx
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── protected-route.tsx
│   ├── clock/
│   │   ├── clock-button.tsx
│   │   ├── clock-status.tsx
│   │   ├── location-indicator.tsx
│   │   └── shift-timer.tsx
│   ├── admin/
│   │   ├── employee-list.tsx
│   │   ├── employee-card.tsx
│   │   ├── schedule-calendar.tsx
│   │   ├── payroll-table.tsx
│   │   ├── location-map.tsx
│   │   ├── analytics-dashboard.tsx
│   │   └── time-off-requests.tsx
│   ├── employee/
│   │   ├── my-schedule.tsx
│   │   ├── hours-log.tsx
│   │   └── profile-form.tsx
│   ├── shared/
│   │   ├── loading-spinner.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-boundary.tsx
│   │   ├── data-table.tsx
│   │   └── date-picker.tsx
│   └── marketing/
│       ├── hero.tsx
│       ├── features-grid.tsx
│       ├── testimonials.tsx
│       ├── pricing-cards.tsx
│       └── cta-section.tsx
├── lib/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   ├── storage.ts
│   │   └── functions.ts
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── employee-service.ts
│   │   ├── shift-service.ts
│   │   ├── payroll-service.ts
│   │   ├── location-service.ts
│   │   ├── notification-service.ts
│   │   └── export-service.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-geolocation.ts
│   │   ├── use-clock-status.ts
│   │   ├── use-shifts.ts
│   │   ├── use-employees.ts
│   │   └── use-payroll.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   ├── validation.ts
│   │   ├── geolocation.ts
│   │   ├── csv-export.ts
│   │   └── calculations.ts
│   ├── constants/
│   │   ├── roles.ts
│   │   ├── routes.ts
│   │   └── config.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── shift.ts
│   │   ├── payroll.ts
│   │   ├── location.ts
│   │   └── index.ts
│   └── validations/
│       ├── auth.ts
│       ├── employee.ts
│       ├── shift.ts
│       └── payroll.ts
├── store/
│   ├── auth-store.ts
│   ├── ui-store.ts
│   └── notification-store.ts
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Feature Specifications

### 1. Location-Based Clock-In/Out System

#### Requirements
- **Geofencing**: Define circular geofence around pharmacy location(s)
- **IP Verification**: Secondary validation using IP address ranges
- **Manual Override**: Admin ability to approve exceptions
- **Offline Support**: Queue clock-in/out when offline, sync when online
- **Photo Verification** (optional): Capture photo on clock-in for audit

#### Technical Implementation
```typescript
// lib/services/location-service.ts

interface PharmacyLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  geofenceRadius: number; // meters
  allowedIpRanges?: string[];
  timezone: string;
}

interface LocationVerification {
  isWithinGeofence: boolean;
  isAllowedIP: boolean;
  distance: number; // meters from center
  accuracy: number; // GPS accuracy in meters
  timestamp: Date;
}

async function verifyLocation(
  userCoordinates: { latitude: number; longitude: number },
  locationId: string,
  ipAddress: string
): Promise<LocationVerification> {
  // 1. Fetch pharmacy location from Firestore
  const location = await getPharmacyLocation(locationId);
  
  // 2. Calculate distance using Haversine formula
  const distance = calculateDistance(
    userCoordinates,
    location.coordinates
  );
  
  // 3. Check if within geofence
  const isWithinGeofence = distance <= location.geofenceRadius;
  
  // 4. Verify IP address (optional)
  const isAllowedIP = location.allowedIpRanges
    ? checkIPRange(ipAddress, location.allowedIpRanges)
    : true;
  
  return {
    isWithinGeofence,
    isAllowedIP,
    distance,
    accuracy: userCoordinates.accuracy || 0,
    timestamp: new Date()
  };
}

// Haversine formula for distance calculation
function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

#### Firestore Schema
```typescript
// Collections: locations
interface LocationDocument {
  id: string;
  organizationId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  geofenceRadius: number; // meters (default: 100)
  allowedIpRanges: string[]; // CIDR notation
  timezone: string; // IANA timezone
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### UI Components
1. **Location Setup (Admin)**
   - Interactive map (Mapbox) to set pharmacy location
   - Draggable circle to adjust geofence radius
   - Visual feedback of geofence area
   - IP range input with validation

2. **Clock-In Screen (Employee)**
   - Large, prominent "Clock In" button
   - Real-time location indicator (green = in range, red = out of range)
   - Distance from pharmacy displayed
   - GPS accuracy indicator
   - Fallback for manual clock-in request (requires admin approval)

3. **Location Verification Modal**
   ```typescript
   interface LocationVerificationModalProps {
     isOpen: boolean;
     onClose: () => void;
     verification: LocationVerification;
     pharmacyLocation: PharmacyLocation;
   }
   ```

---

### 2. Automated Payroll CSV Export

#### Requirements
- **Bi-weekly pay periods**: Configurable start day (e.g., Monday)
- **Overtime calculations**: Time-and-a-half for hours > 40/week
- **Break deductions**: Unpaid break time tracking
- **Holiday pay**: Configurable multipliers (e.g., 1.5x, 2x)
- **CSV format**: Compatible with QuickBooks, ADP, Gusto
- **Email delivery**: Automatic email to admin on pay period close

#### Payroll Calculation Logic
```typescript
// lib/utils/calculations.ts

interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  payRate: number; // hourly rate
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  breakHours: number; // unpaid
  totalHours: number;
  regularPay: number;
  overtimePay: number;
  holidayPay: number;
  grossPay: number;
  deductions?: {
    tax?: number;
    insurance?: number;
    other?: number;
  };
  netPay: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
}

interface Shift {
  id: string;
  employeeId: string;
  locationId: string;
  clockInTime: Date;
  clockOutTime: Date;
  breakDuration: number; // minutes
  isHoliday: boolean;
  isApproved: boolean;
}

function calculatePayrollForPeriod(
  shifts: Shift[],
  employees: Map<string, { name: string; email: string; payRate: number }>,
  periodStart: Date,
  periodEnd: Date
): PayrollEntry[] {
  const entries: Map<string, PayrollEntry> = new Map();

  shifts.forEach(shift => {
    if (!shift.isApproved) return; // Only count approved shifts

    const employee = employees.get(shift.employeeId);
    if (!employee) return;

    // Calculate shift duration in hours
    const shiftDuration =
      (shift.clockOutTime.getTime() - shift.clockInTime.getTime()) /
      (1000 * 60 * 60);
    const breakHours = shift.breakDuration / 60;
    const workedHours = shiftDuration - breakHours;

    // Get or create payroll entry
    let entry = entries.get(shift.employeeId);
    if (!entry) {
      entry = {
        employeeId: shift.employeeId,
        employeeName: employee.name,
        employeeEmail: employee.email,
        payRate: employee.payRate,
        regularHours: 0,
        overtimeHours: 0,
        holidayHours: 0,
        breakHours: 0,
        totalHours: 0,
        regularPay: 0,
        overtimePay: 0,
        holidayPay: 0,
        grossPay: 0,
        netPay: 0,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd
      };
      entries.set(shift.employeeId, entry);
    }

    // Categorize hours
    if (shift.isHoliday) {
      entry.holidayHours += workedHours;
    } else {
      const currentRegularHours = entry.regularHours;
      const weeklyLimit = 40;

      if (currentRegularHours < weeklyLimit) {
        const regularToAdd = Math.min(
          workedHours,
          weeklyLimit - currentRegularHours
        );
        entry.regularHours += regularToAdd;
        const remainingHours = workedHours - regularToAdd;
        if (remainingHours > 0) {
          entry.overtimeHours += remainingHours;
        }
      } else {
        entry.overtimeHours += workedHours;
      }
    }

    entry.breakHours += breakHours;
    entry.totalHours += workedHours;
  });

  // Calculate pay for each entry
  entries.forEach(entry => {
    entry.regularPay = entry.regularHours * entry.payRate;
    entry.overtimePay = entry.overtimeHours * entry.payRate * 1.5;
    entry.holidayPay = entry.holidayHours * entry.payRate * 2;
    entry.grossPay = entry.regularPay + entry.overtimePay + entry.holidayPay;
    entry.netPay = entry.grossPay; // Deductions applied elsewhere
  });

  return Array.from(entries.values());
}

// CSV Export
function generatePayrollCSV(entries: PayrollEntry[]): string {
  const headers = [
    'Employee ID',
    'Employee Name',
    'Email',
    'Pay Rate',
    'Regular Hours',
    'Overtime Hours',
    'Holiday Hours',
    'Break Hours',
    'Total Hours',
    'Regular Pay',
    'Overtime Pay',
    'Holiday Pay',
    'Gross Pay',
    'Net Pay',
    'Period Start',
    'Period End'
  ].join(',');

  const rows = entries.map(entry =>
    [
      entry.employeeId,
      `"${entry.employeeName}"`,
      entry.employeeEmail,
      entry.payRate.toFixed(2),
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      entry.holidayHours.toFixed(2),
      entry.breakHours.toFixed(2),
      entry.totalHours.toFixed(2),
      entry.regularPay.toFixed(2),
      entry.overtimePay.toFixed(2),
      entry.holidayPay.toFixed(2),
      entry.grossPay.toFixed(2),
      entry.netPay.toFixed(2),
      entry.payPeriodStart.toISOString(),
      entry.payPeriodEnd.toISOString()
    ].join(',')
  );

  return [headers, ...rows].join('\n');
}
```

#### Automated Pay Period Close
```typescript
// Firebase Cloud Function (scheduled)
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { sendEmail } from './email-service';

export const closePayPeriod = onSchedule(
  {
    schedule: 'every 2 weeks monday 00:00',
    timeZone: 'America/New_York'
  },
  async (event) => {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() - 1); // Previous day
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 13); // 14 days total

    // Get all organizations
    const orgs = await getOrganizations();

    for (const org of orgs) {
      // Get shifts for period
      const shifts = await getShiftsForPeriod(
        org.id,
        periodStart,
        periodEnd
      );

      // Get employees
      const employees = await getEmployees(org.id);

      // Calculate payroll
      const payrollEntries = calculatePayrollForPeriod(
        shifts,
        employees,
        periodStart,
        periodEnd
      );

      // Generate CSV
      const csv = generatePayrollCSV(payrollEntries);

      // Save to Firestore
      await savePayrollRecord(org.id, {
        periodStart,
        periodEnd,
        entries: payrollEntries,
        csvData: csv,
        generatedAt: now
      });

      // Send email to admin
      const adminEmail = org.adminEmail;
      await sendEmail({
        to: adminEmail,
        subject: `Payroll Ready: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
        body: 'Your bi-weekly payroll CSV is ready for download.',
        attachments: [
          {
            filename: `payroll-${periodStart.toISOString().split('T')[0]}.csv`,
            content: csv
          }
        ]
      });
    }
  }
);
```

#### Firestore Schema
```typescript
// Collections: payroll_periods
interface PayrollPeriodDocument {
  id: string;
  organizationId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: 'draft' | 'processing' | 'completed' | 'paid';
  entries: PayrollEntry[];
  csvUrl: string; // Firebase Storage URL
  totalGrossPay: number;
  totalNetPay: number;
  employeeCount: number;
  generatedAt: Timestamp;
  paidAt?: Timestamp;
  notes?: string;
}
```

---

### 3. Admin Dashboard

#### Dashboard Sections

##### 3.1 Overview (Home)
- **Real-time metrics**:
  - Employees currently clocked in (with names and time elapsed)
  - Today's total hours worked
  - Weekly hours trend (chart)
  - Upcoming shifts (next 7 days)
- **Quick actions**:
  - Approve pending time-off requests
  - Review flagged clock-ins (out of range, unusual times)
  - Generate payroll report
- **Alerts**:
  - Employees approaching overtime
  - Missed clock-outs
  - Upcoming holidays

##### 3.2 Employee Management
- **Employee list** (searchable, filterable):
  - Name, role, status (active/inactive)
  - Current shift status
  - Total hours this period
  - Quick actions (edit, view details, deactivate)
- **Employee detail page**:
  - Profile information
  - Pay rate and schedule
  - Hours history (chart + table)
  - Attendance record (on-time %, absences)
  - Time-off balance
  - Performance notes

##### 3.3 Schedule Management
- **Calendar view**:
  - Week/month toggle
  - Drag-and-drop shift assignment
  - Color-coded by employee
  - Shift conflict detection
- **Shift templates**:
  - Recurring shifts (e.g., "Monday 9am-5pm")
  - Bulk assign shifts
- **Shift swap requests**:
  - Pending approvals
  - History log

##### 3.4 Location Management
- **Location list**:
  - Name, address, active employees
  - Geofence visualization
  - Quick edit
- **Location detail**:
  - Map with geofence overlay
  - Adjust radius
  - Manage IP ranges
  - View location-specific analytics

##### 3.5 Payroll
- **Pay periods**:
  - List of all pay periods (status: draft, completed, paid)
  - Quick export CSV
  - View detailed breakdown
- **Pay period detail**:
  - Employee-by-employee breakdown
  - Overtime summary
  - Anomaly detection (e.g., unusually high hours)
  - Approve/edit before export
- **Payroll settings**:
  - Configure pay period schedule
  - Set overtime rules
  - Holiday calendar

##### 3.6 Reports & Analytics
- **Attendance report**:
  - On-time rate per employee
  - Absence trends
  - Late clock-ins/outs
- **Hours report**:
  - Total hours by employee, location, date range
  - Overtime breakdown
  - Peak hours analysis
- **Payroll summary**:
  - Total labor cost by period
  - Average hourly rate
  - Cost per location
- **Export options**:
  - PDF reports
  - CSV exports
  - Schedule email reports

##### 3.7 Settings
- **Company profile**:
  - Name, logo, contact info
- **User management**:
  - Admin/manager roles
  - Permissions
- **Integrations**:
  - Connect QuickBooks, Xero, Google Calendar
  - API keys
- **Notifications**:
  - Configure email/SMS alerts
  - Push notification preferences
- **Billing**:
  - Current plan
  - Usage statistics
  - Invoice history

#### Dashboard UI Components
```typescript
// components/admin/analytics-dashboard.tsx

interface Metric {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon: React.ComponentType;
}

interface DashboardMetrics {
  clockedIn: Metric;
  todayHours: Metric;
  weeklyHours: Metric;
  upcomingShifts: Metric;
}

const AnalyticsDashboard = ({ metrics }: { metrics: DashboardMetrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.values(metrics).map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              {metric.label}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            {metric.change && (
              <p className={`text-xs ${
                metric.change.trend === 'up'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {metric.change.trend === 'up' ? '↑' : '↓'}{' '}
                {Math.abs(metric.change.value)}% from last week
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

---

### 4. Employee Features

#### 4.1 Clock In/Out Interface
- **Primary action**: Large, centered clock button
  - Green "Clock In" when clocked out
  - Red "Clock Out" when clocked in
- **Current status display**:
  - Time since clock-in (live updating)
  - Location verification status
  - Today's total hours
- **Break management**:
  - "Start Break" / "End Break" buttons
  - Break timer
  - Automatic break reminders (e.g., after 5 hours)

#### 4.2 My Schedule
- **Week view**: Shows assigned shifts
- **Shift details**: Location, time, notes
- **Request time off**: Inline form
- **Shift swap**: Request to trade with coworker

#### 4.3 Hours Log
- **Historical view**: Table of all shifts
- **Filters**: Date range, location
- **Details**: Clock-in/out times, breaks, total hours
- **Disputes**: Flag discrepancies for admin review

#### 4.4 Profile
- **Personal info**: Name, email, phone
- **Emergency contact**
- **Time-off balance**
- **Preferences**: Notifications, language

---

### 5. Advanced Features (Phase 2+)

#### 5.1 Break Time Tracking
- Automatic reminders after X hours worked
- Compliance alerts (e.g., CA requires 10-min break per 4 hours)
- Paid vs. unpaid break configuration

#### 5.2 Shift Swap System
- Employee initiates swap request
- Matched employee approves
- Admin final approval
- Notifications at each step

#### 5.3 Time-Off Management
- Request time off (vacation, sick, personal)
- Approval workflow
- Balance tracking (accrued hours)
- Calendar integration

#### 5.4 Multi-Location Support
- Switch between locations
- Location-specific schedules
- Transfer employees between locations
- Consolidated reporting across locations

#### 5.5 Overtime & Holiday Pay
- Automatic overtime calculation (>40 hrs/week)
- Holiday calendar with custom multipliers
- Weekend differential (if applicable)
- State-specific labor law compliance

#### 5.6 Performance Metrics
- On-time arrival rate
- Attendance score
- Hours consistency
- Peer ratings (optional)

#### 5.7 Push Notifications
- Shift reminders (1 hour before)
- Schedule changes
- Time-off request updates
- Payroll ready notification

#### 5.8 Integrations
- **QuickBooks**: Sync payroll data
- **Xero**: Accounting integration
- **Google Calendar**: Shift sync
- **Slack**: Notifications
- **Twilio**: SMS alerts

#### 5.9 Audit Logs
- All clock-in/out events
- Admin actions (edits, approvals)
- IP addresses and GPS coordinates
- Exportable for compliance

#### 5.10 Role-Based Permissions
- **Owner**: Full access
- **Manager**: Employee management, reports (no billing)
- **Pharmacist**: View schedule, limited employee data
- **Technician**: Clock in/out, own schedule only

---

## Technical Implementation

### Firestore Database Schema

```typescript
// Collections Structure

// 1. organizations
interface Organization {
  id: string;
  name: string;
  logo?: string;
  industry: 'pharmacy' | 'retail' | 'healthcare' | 'other';
  settings: {
    payPeriodStart: 'monday' | 'sunday'; // First day of pay period
    payPeriodFrequency: 'weekly' | 'biweekly' | 'monthly';
    overtimeThreshold: number; // hours per week
    overtimeMultiplier: number; // e.g., 1.5
    holidayMultiplier: number; // e.g., 2
    timezone: string; // IANA timezone
    currency: string; // ISO 4217
  };
  billing: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'trial' | 'cancelled';
    employeeLimit: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 2. users
interface User {
  id: string; // Same as Firebase Auth UID
  organizationId: string;
  email: string;
  name: string;
  phone?: string;
  role: 'owner' | 'manager' | 'pharmacist' | 'technician';
  status: 'active' | 'inactive' | 'terminated';
  employeeDetails?: {
    employeeId: string; // Custom ID (e.g., EMP-001)
    payRate: number; // Hourly rate
    position: string; // Job title
    hireDate: Timestamp;
    terminationDate?: Timestamp;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    timeOffBalance: {
      vacation: number; // hours
      sick: number;
      personal: number;
    };
  };
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 3. locations
interface Location {
  id: string;
  organizationId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  geofenceRadius: number; // meters
  allowedIpRanges?: string[]; // CIDR notation
  timezone: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 4. shifts (scheduled shifts)
interface Shift {
  id: string;
  organizationId: string;
  locationId: string;
  employeeId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  breakDuration?: number; // minutes
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  isRecurring: boolean;
  recurrenceRule?: string; // RRULE format
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 5. time_entries (actual clock-in/out records)
interface TimeEntry {
  id: string;
  organizationId: string;
  locationId: string;
  employeeId: string;
  shiftId?: string; // Link to scheduled shift
  clockInTime: Timestamp;
  clockInLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  clockInIp: string;
  clockInPhoto?: string; // Firebase Storage URL
  clockOutTime?: Timestamp;
  clockOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  clockOutIp?: string;
  clockOutPhoto?: string;
  breaks: Array<{
    startTime: Timestamp;
    endTime?: Timestamp;
    type: 'paid' | 'unpaid';
  }>;
  totalBreakDuration: number; // minutes
  totalHours?: number; // Calculated after clock-out
  isApproved: boolean;
  approvedBy?: string; // User ID
  approvedAt?: Timestamp;
  flags?: Array<{
    type: 'out_of_range' | 'unusual_time' | 'long_shift' | 'missing_clockout';
    message: string;
    createdAt: Timestamp;
  }>;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 6. payroll_periods
interface PayrollPeriod {
  id: string;
  organizationId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: 'draft' | 'processing' | 'completed' | 'paid';
  entries: Array<{
    employeeId: string;
    employeeName: string;
    regularHours: number;
    overtimeHours: number;
    holidayHours: number;
    totalHours: number;
    regularPay: number;
    overtimePay: number;
    holidayPay: number;
    grossPay: number;
    deductions: number;
    netPay: number;
  }>;
  csvUrl?: string; // Firebase Storage URL
  totalGrossPay: number;
  totalNetPay: number;
  employeeCount: number;
  generatedAt: Timestamp;
  generatedBy: string; // User ID
  paidAt?: Timestamp;
  notes?: string;
}

// 7. time_off_requests
interface TimeOffRequest {
  id: string;
  organizationId: string;
  employeeId: string;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  startDate: Timestamp;
  endDate: Timestamp;
  totalHours: number;
  reason?: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  reviewedBy?: string; // User ID
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 8. shift_swap_requests
interface ShiftSwapRequest {
  id: string;
  organizationId: string;
  requestingEmployeeId: string;
  targetEmployeeId: string;
  shiftId: string;
  status: 'pending_target' | 'pending_admin' | 'approved' | 'denied';
  approvedBy?: string; // User ID
  approvedAt?: Timestamp;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 9. notifications
interface Notification {
  id: string;
  userId: string;
  type: 'shift_reminder' | 'time_off_update' | 'schedule_change' | 'payroll_ready';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Timestamp;
}

// 10. audit_logs
interface AuditLog {
  id: string;
  organizationId: string;
  userId: string; // Who performed the action
  action: string; // e.g., 'clock_in', 'edit_employee', 'approve_timeoff'
  entityType: 'time_entry' | 'user' | 'shift' | 'payroll' | 'location';
  entityId: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress: string;
  userAgent: string;
  createdAt: Timestamp;
}
```

### Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isOwner() {
      return isAuthenticated() && getUserData().role == 'owner';
    }
    
    function isManager() {
      return isAuthenticated() && getUserData().role in ['owner', 'manager'];
    }
    
    function belongsToOrg(orgId) {
      return isAuthenticated() && getUserData().organizationId == orgId;
    }
    
    function isOwnProfile() {
      return isAuthenticated() && request.auth.uid == resource.id;
    }
    
    // Organizations
    match /organizations/{orgId} {
      allow read: if belongsToOrg(orgId);
      allow write: if belongsToOrg(orgId) && isOwner();
    }
    
    // Users
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        belongsToOrg(resource.data.organizationId) || isOwnProfile()
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        isManager() || isOwnProfile()
      );
      allow delete: if belongsToOrg(resource.data.organizationId) && isOwner();
    }
    
    // Locations
    match /locations/{locationId} {
      allow read: if belongsToOrg(resource.data.organizationId);
      allow write: if belongsToOrg(resource.data.organizationId) && isManager();
    }
    
    // Shifts
    match /shifts/{shiftId} {
      allow read: if isAuthenticated() && (
        belongsToOrg(resource.data.organizationId) ||
        resource.data.employeeId == request.auth.uid
      );
      allow write: if belongsToOrg(resource.data.organizationId) && isManager();
    }
    
    // Time Entries
    match /time_entries/{entryId} {
      allow read: if isAuthenticated() && (
        belongsToOrg(resource.data.organizationId) ||
        resource.data.employeeId == request.auth.uid
      );
      allow create: if isAuthenticated() && 
        request.resource.data.employeeId == request.auth.uid;
      allow update: if isAuthenticated() && (
        (resource.data.employeeId == request.auth.uid && 
         !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isApproved'])) ||
        (belongsToOrg(resource.data.organizationId) && isManager())
      );
      allow delete: if belongsToOrg(resource.data.organizationId) && isOwner();
    }
    
    // Payroll Periods
    match /payroll_periods/{periodId} {
      allow read: if belongsToOrg(resource.data.organizationId);
      allow write: if belongsToOrg(resource.data.organizationId) && isManager();
    }
    
    // Time Off Requests
    match /time_off_requests/{requestId} {
      allow read: if isAuthenticated() && (
        belongsToOrg(resource.data.organizationId) ||
        resource.data.employeeId == request.auth.uid
      );
      allow create: if isAuthenticated() && 
        request.resource.data.employeeId == request.auth.uid;
      allow update: if isAuthenticated() && (
        (resource.data.employeeId == request.auth.uid && 
         resource.data.status == 'pending') ||
        (belongsToOrg(resource.data.organizationId) && isManager())
      );
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Audit Logs
    match /audit_logs/{logId} {
      allow read: if belongsToOrg(resource.data.organizationId) && isOwner();
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

### API Routes

```typescript
// app/api/clock/in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { verifyLocation } from '@/lib/services/location-service';
import { createTimeEntry } from '@/lib/services/time-entry-service';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { locationId, coordinates, photoData } = body;

    // 3. Verify location
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const verification = await verifyLocation(
      coordinates,
      locationId,
      ipAddress
    );

    if (!verification.isWithinGeofence) {
      return NextResponse.json(
        {
          error: 'Location verification failed',
          details: `You are ${verification.distance}m from the pharmacy. Please move closer.`
        },
        { status: 403 }
      );
    }

    // 4. Check for existing active time entry
    const existingEntry = await getActiveTimeEntry(user.uid);
    if (existingEntry) {
      return NextResponse.json(
        { error: 'Already clocked in' },
        { status: 400 }
      );
    }

    // 5. Create time entry
    const timeEntry = await createTimeEntry({
      employeeId: user.uid,
      locationId,
      clockInTime: new Date(),
      clockInLocation: coordinates,
      clockInIp: ipAddress,
      clockInPhoto: photoData ? await uploadPhoto(photoData) : undefined,
      verification
    });

    // 6. Create audit log
    await createAuditLog({
      userId: user.uid,
      action: 'clock_in',
      entityType: 'time_entry',
      entityId: timeEntry.id,
      ipAddress
    });

    return NextResponse.json({
      success: true,
      timeEntry,
      message: 'Clocked in successfully'
    });
  } catch (error) {
    console.error('Clock-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// app/api/clock/out/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { coordinates, photoData } = body;

    // Get active time entry
    const timeEntry = await getActiveTimeEntry(user.uid);
    if (!timeEntry) {
      return NextResponse.json(
        { error: 'No active clock-in found' },
        { status: 400 }
      );
    }

    // Verify location (optional for clock-out)
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const verification = await verifyLocation(
      coordinates,
      timeEntry.locationId,
      ipAddress
    );

    // Calculate total hours
    const clockOutTime = new Date();
    const totalHours = calculateTotalHours(
      timeEntry.clockInTime,
      clockOutTime,
      timeEntry.breaks
    );

    // Update time entry
    await updateTimeEntry(timeEntry.id, {
      clockOutTime,
      clockOutLocation: coordinates,
      clockOutIp: ipAddress,
      clockOutPhoto: photoData ? await uploadPhoto(photoData) : undefined,
      totalHours,
      flags: verification.isWithinGeofence
        ? []
        : [{
            type: 'out_of_range',
            message: `Clocked out ${verification.distance}m from location`,
            createdAt: clockOutTime
          }]
    });

    // Audit log
    await createAuditLog({
      userId: user.uid,
      action: 'clock_out',
      entityType: 'time_entry',
      entityId: timeEntry.id,
      ipAddress
    });

    return NextResponse.json({
      success: true,
      totalHours,
      message: 'Clocked out successfully'
    });
  } catch (error) {
    console.error('Clock-out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// app/api/payroll/generate/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { periodStart, periodEnd } = body;

    // Get all time entries for period
    const timeEntries = await getTimeEntriesForPeriod(
      user.organizationId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    // Get all employees
    const employees = await getEmployees(user.organizationId);

    // Calculate payroll
    const payrollEntries = calculatePayrollForPeriod(
      timeEntries,
      employees,
      new Date(periodStart),
      new Date(periodEnd)
    );

    // Generate CSV
    const csv = generatePayrollCSV(payrollEntries);

    // Upload to Firebase Storage
    const csvUrl = await uploadCSV(csv, `payroll-${periodStart}.csv`);

    // Save payroll period
    const payrollPeriod = await createPayrollPeriod({
      organizationId: user.organizationId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      entries: payrollEntries,
      csvUrl,
      totalGrossPay: payrollEntries.reduce((sum, e) => sum + e.grossPay, 0),
      totalNetPay: payrollEntries.reduce((sum, e) => sum + e.netPay, 0),
      employeeCount: payrollEntries.length,
      generatedBy: user.uid
    });

    // Send email notification
    await sendPayrollEmail(user.email, csvUrl, periodStart, periodEnd);

    return NextResponse.json({
      success: true,
      payrollPeriod,
      csvUrl
    });
  } catch (error) {
    console.error('Payroll generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Middleware (Route Protection)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/features', '/pricing', '/about'];
  if (publicRoutes.includes(pathname) || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token (pseudo-code)
  try {
    const user = await verifyAuthToken(token);
    
    // Role-based access
    if (pathname.startsWith('/dashboard/admin')) {
      if (!['owner', 'manager'].includes(user.role)) {
        return NextResponse.redirect(new URL('/dashboard/employee', request.url));
      }
    }
    
    if (pathname.startsWith('/dashboard/employee')) {
      if (!['technician', 'pharmacist'].includes(user.role)) {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Security & Compliance

### 1. Authentication Security
- **Password requirements**: Min 8 chars, uppercase, lowercase, number, symbol
- **MFA support**: Optional 2FA via SMS or authenticator app
- **Session management**: JWT tokens with 7-day expiry, refresh tokens
- **Password reset**: Secure email-based flow with time-limited tokens

### 2. Data Encryption
- **In transit**: All data transmitted over HTTPS (TLS 1.3)
- **At rest**: Firestore automatic encryption
- **Sensitive data**: Additional encryption for SSN, bank info (if stored)

### 3. HIPAA Compliance (if handling health data)
- **BAA with Firebase**: Sign Business Associate Agreement
- **Audit logs**: Comprehensive logging of all data access
- **Data retention**: Configurable retention policies
- **Access controls**: Role-based access, least privilege principle

### 4. Privacy
- **GDPR compliance**: Data export, deletion, consent management
- **Privacy policy**: Clear disclosure of data collection and use
- **Cookie consent**: Banner for EU visitors
- **Data minimization**: Collect only necessary data

### 5. Rate Limiting
- **API endpoints**: Limit to prevent abuse (e.g., 100 req/min per IP)
- **Clock-in/out**: Max 1 clock-in per 5 minutes
- **Login attempts**: Max 5 failed attempts per 15 minutes

### 6. Input Validation
- **Zod schemas**: Validate all user inputs
- **SQL injection**: N/A (NoSQL Firestore)
- **XSS prevention**: Sanitize all user-generated content
- **CSRF protection**: Token-based validation for state-changing operations

### 7. Monitoring & Alerts
- **Error tracking**: Sentry for real-time error monitoring
- **Anomaly detection**: Alert on unusual patterns (e.g., 50 clock-ins in 1 hour)
- **Uptime monitoring**: Status page with incident notifications

---

## Deployment & DevOps

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_SERVICE_ACCOUNT_KEY=

NEXT_PUBLIC_MAPBOX_TOKEN=

RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

SENTRY_DSN=

QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=

NEXT_PUBLIC_APP_URL=https://pharmaclock.com
```

### Database Backups
- **Automated daily backups**: Firebase native backups
- **Retention**: 30 days
- **Disaster recovery**: Documented restore procedure

---

## Testing Strategy

### 1. Unit Tests (Jest + React Testing Library)
```typescript
// __tests__/utils/calculations.test.ts
import { calculatePayrollForPeriod } from '@/lib/utils/calculations';

describe('calculatePayrollForPeriod', () => {
  it('calculates regular hours correctly', () => {
    const shifts = [
      {
        id: '1',
        employeeId: 'emp1',
        clockInTime: new Date('2024-01-01T09:00:00'),
        clockOutTime: new Date('2024-01-01T17:00:00'),
        breakDuration: 30,
        isHoliday: false,
        isApproved: true
      }
    ];
    
    const employees = new Map([
      ['emp1', { name: 'John Doe', email: 'john@example.com', payRate: 20 }]
    ]);
    
    const result = calculatePayrollForPeriod(
      shifts,
      employees,
      new Date('2024-01-01'),
      new Date('2024-01-07')
    );
    
    expect(result[0].regularHours).toBe(7.5);
    expect(result[0].regularPay).toBe(150);
  });
  
  it('calculates overtime correctly', () => {
    // Test with >40 hours
  });
  
  it('applies holiday multiplier', () => {
    // Test holiday pay
  });
});
```

### 2. Integration Tests (Playwright)
```typescript
// tests/e2e/clock-in.spec.ts
import { test, expect } from '@playwright/test';

test('employee can clock in successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'employee@test.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard/employee');
  
  // Mock geolocation
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
  
  await page.click('button:has-text("Clock In")');
  
  await expect(page.locator('text=Clocked in successfully')).toBeVisible();
  await expect(page.locator('button:has-text("Clock Out")')).toBeVisible();
});
```

### 3. Load Testing (k6)
```javascript
// tests/load/clock-in.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  let res = http.post('https://pharmaclock.com/api/clock/in', JSON.stringify({
    locationId: 'loc123',
    coordinates: { latitude: 37.7749, longitude: -122.4194 }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## Phase Rollout Plan

### Phase 1: MVP (Weeks 1-4)
**Goal**: Core functionality for single-location pharmacy

**Features**:
- ✅ User authentication (login, registration)
- ✅ Location-based clock-in/out
- ✅ Admin dashboard (basic)
- ✅ Employee list and management
- ✅ Bi-weekly payroll CSV export
- ✅ Mobile-responsive UI

**Deliverables**:
- Landing page with Deel-inspired design
- Admin portal with employee management
- Employee clock-in/out interface
- Automated CSV generation
- Documentation

**Success Metrics**:
- 1 pharmacy onboarded for pilot
- 100% clock-in accuracy within geofence
- CSV export matches manual calculations

---

### Phase 2: Enhanced Features (Weeks 5-8)
**Goal**: Scalability and advanced features

**Features**:
- ✅ Multi-location support
- ✅ Break time tracking
- ✅ Overtime and holiday pay
- ✅ Schedule management (calendar view)
- ✅ Time-off requests
- ✅ Push notifications
- ✅ Advanced analytics

**Deliverables**:
- Calendar-based scheduling
- Break compliance alerts
- Enhanced dashboard with charts
- Mobile PWA with push notifications

**Success Metrics**:
- Support 3+ locations per pharmacy
- 95% employee satisfaction with scheduling
- 20% reduction in admin time

---

### Phase 3: Integrations & Scale (Weeks 9-12)
**Goal**: Enterprise readiness

**Features**:
- ✅ QuickBooks/Xero integration
- ✅ Google Calendar sync
- ✅ Slack notifications
- ✅ API for third-party integrations
- ✅ White-label option
- ✅ HIPAA compliance certification

**Deliverables**:
- Public API with documentation
- Accounting software integrations
- Enterprise support tier
- Security audit report

**Success Metrics**:
- 10+ pharmacies onboarded
- 99.9% uptime
- SOC 2 Type II compliance

---

### Phase 4: Growth & Optimization (Weeks 13+)
**Goal**: Market leadership

**Features**:
- ✅ AI-powered scheduling optimization
- ✅ Predictive analytics (labor cost forecasting)
- ✅ Employee performance insights
- ✅ Mobile app (iOS/Android native)
- ✅ Multi-language support
- ✅ Advanced reporting suite

**Deliverables**:
- Native mobile apps
- AI-driven insights dashboard
- Expansion to other industries (retail, healthcare)

**Success Metrics**:
- 100+ pharmacies
- $500K ARR
- 4.8+ star rating on review sites

---

## Conclusion

This implementation plan transforms PharmaClock from an MVP into a production-ready, enterprise-grade time tracking and payroll management system. By adopting Deel's design philosophy of trust, clarity, and scalability, and implementing robust location verification, automated payroll processing, and comprehensive admin tools, PharmaClock will become the go-to solution for pharmacy workforce management.

**Key Differentiators**:
1. **Location-first**: GPS + IP verification ensures employees are on-site
2. **Automation**: Bi-weekly CSV exports save 10+ hours per pay period
3. **Compliance**: Built-in labor law compliance and audit trails
4. **Beautiful UX**: Deel-inspired design that users actually enjoy using
5. **Scalable**: From single location to national pharmacy chains

**Next Steps**:
1. Review and approve this implementation plan
2. Set up development environment (Firebase, Vercel, GitHub)
3. Begin Phase 1 development with 2-week sprints
4. Recruit 1-2 pilot pharmacies for beta testing
5. Iterate based on feedback and launch Phase 2

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-03  
**Author**: PharmaClock Development Team  
**Status**: Ready for Implementation