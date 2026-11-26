// Public directory records, reviewed 26 November 2026. A record identifies a
// location/payment route. Several records can share a room or a building.
// A quantity is recorded only when the operator publishes a number of devices.
export interface PrinterSite {
  id: string
  building: string
  buildingName: string
  location: string
  method: 'quota' | 'macaupass' | 'unknown'
  methodDetail?: string
  units?: number
  lat: number
  lng: number
  serviceScope: '24h' | 'scheduled' | 'unknown'
  service: string
  support: string
  access?: string
  aliases?: string[]
  sources: { label: string; url: string }[]
}

interface MapPoint {
  lat: number
  lng: number
  feature: string
}

// Coordinates are WGS84 point features from the UM eMap. Three building-level
// anchors are the centres of eMap building footprints. Floors and room names
// come from the cited operator; the map is for finding the building.
const points = {
  e6Ground: { lat: 22.1285254, lng: 113.544978, feature: 'node/11419061926' },
  e6First: { lat: 22.1285812, lng: 113.544981, feature: 'node/11530162180' },
  e6Second: { lat: 22.1285803, lng: 113.5450206, feature: 'node/11419061494' },
  e6Third: { lat: 22.1285247, lng: 113.5450197, feature: 'node/11330274247' },
  e2Ground: { lat: 22.1299375, lng: 113.5448879, feature: 'node/11418968235' },
  e2First: { lat: 22.1299379, lng: 113.5448025, feature: 'node/11668687169' },
  e2Third: { lat: 22.1299397, lng: 113.5448476, feature: 'node/11419056263' },
  e2Building: { lat: 22.1300423, lng: 113.5450769, feature: 'way/241702236' },
  w34Building: { lat: 22.1255419, lng: 113.5415552, feature: 'way/289598364' },
  s9Building: { lat: 22.1243946, lng: 113.5436009, feature: 'way/289598417' },
} satisfies Record<string, MapPoint>

const followYou = {
  label: 'ICTO · Follow-You printing',
  url: 'https://icto.um.edu.mo/printing/follow-you-student-printing/',
}
const e6Mobile = {
  label: 'ICTO · Macau Pass printing in E6',
  url: 'https://icto.um.edu.mo/printing/macau-pass-mobile-print/',
}
const libFacilities = {
  label: 'Library · printers by floor',
  url: 'https://library.um.edu.mo/using_the_lib/facilities_en',
}
const libHours = {
  label: 'Library · opening hours and exceptions',
  url: 'https://library.um.edu.mo/lib_info/openhours_en',
}
const libSupport = {
  label: 'Library · IT Service Counter hours',
  url: 'https://library.um.edu.mo/lib_services/room_guidelines_en',
}
const unitContacts = {
  label: 'UM · unit contacts',
  url: 'https://www.um.edu.mo/contact/unit-contacts/',
}

function emap(point: MapPoint) {
  const building = point.feature.startsWith('way/')
  return {
    label: building ? 'UM eMap · building' : 'UM eMap · printing area',
    url: 'https://map.um.edu.mo/?lang=en&geoJsonId=' + point.feature,
  }
}

function e6(
  id: string,
  location: string,
  point: MapPoint,
  method: 'quota' | 'macaupass',
): PrinterSite {
  return {
    id,
    building: 'E6',
    buildingName: 'Central Teaching Building',
    location,
    lat: point.lat,
    lng: point.lng,
    method,
    methodDetail:
      method === 'quota'
        ? 'Charges use your UM printing quota. Release your job with your campus card or UMPASS.'
        : 'ICTO lists Macau Pass payment for this station. Check the payment terminal for accepted options.',
    serviceScope: '24h',
    service: 'Daily, 24 hours (published ICTO service schedule).',
    support:
      'ICTO: Mon–Thu 09:00–13:00 and 14:00–17:45; Fri 09:00–13:00 and 14:00–17:30.',
    sources: [emap(point), method === 'quota' ? followYou : e6Mobile],
  }
}

function library(
  id: string,
  location: string,
  point: MapPoint,
  method: 'quota' | 'macaupass',
  units: number,
): PrinterSite {
  return {
    id,
    building: 'E2',
    buildingName: 'Wu Yee Sun Library',
    location,
    method,
    units,
    lat: point.lat,
    lng: point.lng,
    methodDetail:
      method === 'quota'
        ? 'Follow-You printing uses your UM printing quota and UMPASS.'
        : 'Use a designated library computer and pay through your Macau Pass account.',
    serviceScope: 'scheduled',
    service:
      'Library access is normally 08:00–24:00 daily. Special dates have different hours.',
    support:
      'Ground-floor IT Service Counter: Mon–Fri 09:00–20:30, Sat–Sun 10:00–17:30. Closed on public holidays and library closure days.',
    sources: [emap(point), libFacilities, libHours, libSupport],
  }
}

function faculty(
  building: string,
  buildingName: string,
  location: string,
  point: MapPoint,
  aliases?: string[],
): PrinterSite {
  return {
    id: building.toLowerCase() + '-printing-area',
    building,
    buildingName,
    location,
    aliases,
    lat: point.lat,
    lng: point.lng,
    method: 'unknown',
    methodDetail:
      'Check the payment label on the printer or ask the faculty office.',
    serviceScope: 'unknown',
    service: 'The faculty has not published printer hours in the directory.',
    support:
      'Printer support times are unlisted. Contact the faculty office before travelling.',
    sources: [emap(point), unitContacts],
  }
}

function college(
  building: string,
  buildingName: string,
  location: string,
  point: MapPoint,
  guide: PrinterSite['sources'][number],
): PrinterSite {
  return {
    id: building.toLowerCase() + '-printing-area',
    building,
    buildingName,
    location,
    lat: point.lat,
    lng: point.lng,
    method: 'unknown',
    methodDetail: 'Ask the college about payment before using this printer.',
    serviceScope: 'unknown',
    service: 'Printer service hours are unlisted.',
    support: 'Printer support times are unlisted. Contact the college office.',
    access:
      'College facility. Visitors should confirm access with the college before travelling.',
    sources: [emap(point), guide, unitContacts],
  }
}

export const sites: PrinterSite[] = [
  e6(
    'e6-g111i-quota',
    'G/F · Learning Commons, room G111i',
    points.e6Ground,
    'quota',
  ),
  e6(
    'e6-g111i-pass',
    'G/F · Learning Commons, room G111i',
    points.e6Ground,
    'macaupass',
  ),
  e6('e6-1091a', '1/F · Learning Commons, room 1091a', points.e6First, 'quota'),
  e6(
    'e6-2093',
    '2/F · corridor outside computer room 2093',
    points.e6Second,
    'quota',
  ),
  e6(
    'e6-3094',
    '3/F · corridor outside computer room 3094',
    points.e6Third,
    'quota',
  ),
  library(
    'e2-gf-commons-quota',
    'G/F · Information Commons',
    points.e2Ground,
    'quota',
    2,
  ),
  library(
    'e2-gf-commons-pass',
    'G/F · Information Commons',
    points.e2Ground,
    'macaupass',
    1,
  ),
  library(
    'e2-gf-reading',
    'G/F · Newspaper and Periodical Reading Area',
    points.e2Ground,
    'macaupass',
    1,
  ),
  library('e2-1f-macau', '1/F · Macau Corner', points.e2First, 'macaupass', 1),
  library(
    'e2-2f-zone-c',
    '2/F · Zone C, near room 2035',
    points.e2Building,
    'quota',
    1,
  ),
  library(
    'e2-3f-zone-b-quota',
    '3/F · Zone B, Quiet Reading Area',
    points.e2Third,
    'quota',
    1,
  ),
  library(
    'e2-3f-zone-b-pass',
    '3/F · Zone B, Quiet Reading Area',
    points.e2Third,
    'macaupass',
    1,
  ),
  library(
    'e2-4f-zone-b',
    '4/F · Zone B, near room 4016',
    points.e2Building,
    'quota',
    1,
  ),
  // The eMap identifies these seven printing areas but has no payment or
  // opening_hours field. Its photos and a generic faculty printing leaflet
  // are insufficient to establish which payment terminal is installed.
  faculty(
    'E11',
    'Science and Engineering',
    'G/F · Learning Commons',
    {
      lat: 22.1321734,
      lng: 113.5435626,
      feature: 'node/11418920580',
    },
    ['Faculty of Science and Technology', 'FST', 'FEG', 'FSC'],
  ),
  faculty(
    'E12',
    'Faculty of Medicine',
    'G/F · printing area',
    {
      lat: 22.1310818,
      lng: 113.5432453,
      feature: 'node/11419077825',
    },
    ['Faculty of Health Sciences', 'FHS', 'FMD'],
  ),
  faculty('E21A', 'Faculty of Arts and Humanities', 'G/F · Learning Commons', {
    lat: 22.1295532,
    lng: 113.5430387,
    feature: 'node/11419087664',
  }),
  faculty('E21B', 'Faculty of Social Sciences', '1/F · printing area', {
    lat: 22.1289866,
    lng: 113.54306,
    feature: 'node/11418977599',
  }),
  faculty('E22', 'Faculty of Business Administration', 'G/F · printing area', {
    lat: 22.1282531,
    lng: 113.5431572,
    feature: 'node/11419061527',
  }),
  faculty('E32', 'Faculty of Law', 'G/F · Learning Commons', {
    lat: 22.126371,
    lng: 113.5438826,
    feature: 'node/11418920581',
  }),
  faculty('E33', 'Faculty of Education', '1/F · printing area', {
    lat: 22.12585,
    lng: 113.5442539,
    feature: 'node/11419079924',
  }),
  college(
    'S9',
    'Shiu Pong College',
    'G/F · self-service printing area near room G015',
    points.s9Building,
    {
      label: 'Shiu Pong College · 2025–26 guide, p. 26',
      url: 'https://spc.rc.um.edu.mo/wp-content/uploads/2025/07/Pamphlet_Student-Handbook-2025-26.pdf#page=26',
    },
  ),
  college(
    'W34',
    'Cheong Kun Lun College',
    'Printing Corner · ask the college for the floor',
    points.w34Building,
    {
      label: 'Cheong Kun Lun College · facilities',
      url: 'https://cklc.rc.um.edu.mo/our-facilities/',
    },
  ),
]
