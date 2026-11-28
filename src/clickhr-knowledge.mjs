import { clickHrAppListing, clickHrGuides } from './clickhr-guides.mjs';

const modules = 'https://www.clickhr.app/modules/';
const mobile = `${modules}hr-mobile-app-cambodia/`;
const leave = `${modules}leave-management-cambodia/`;
const attendance = `${modules}attendance-management-cambodia/`;
const leaveTerms = ['leave', 'time off', 'vacation', 'pto', 'ច្បាប់ឈប់', 'ឈប់សម្រាក'];
const iOSSteps = (copy) => ({ ...copy, url: clickHrAppListing });

// Each entry covers one customer task. Screen instructions require their own source.
export const clickHrKnowledge = [
  {
    id: 'leave-approval', topic: 'leave', title: 'Approve a leave request on mobile', url: leave,
    terms: [leaveTerms, ['approve', 'approves', 'approving', 'approval', 'sign off', 'authorize', 'អនុម័ត', 'យល់ព្រម']],
    en: 'Click HR supports leave approvals in its mobile app. Ask your company’s administrator to confirm who can approve requests in your setup.',
    km: 'Click HR គាំទ្រការអនុម័តសំណើឈប់សម្រាកក្នុងកម្មវិធីទូរស័ព្ទ។ សូមសួរអ្នកគ្រប់គ្រងរបស់ក្រុមហ៊ុនអ្នកថាអ្នកណាអាចអនុម័តសំណើបាន។',
  },
  {
    id: 'leave-request', topic: 'leave', title: 'Submit a leave request on mobile', url: mobile,
    terms: [leaveTerms, ['request', 'submit', 'ask for', 'apply', 'ស្នើ', 'សុំ', 'ដាក់សំណើ']],
    en: 'Employees can submit leave requests in the Click HR mobile app.',
    km: 'បុគ្គលិកអាចដាក់សំណើឈប់សម្រាកក្នុងកម្មវិធី Click HR លើទូរស័ព្ទ។',
    steps: iOSSteps(clickHrGuides.requestLeave),
  },
  {
    id: 'attendance-clock-in', topic: 'attendance', title: 'Record arrival in the mobile app', url: attendance,
    terms: [['clock in', 'clocking in', 'punch in', 'punching in', 'check in at work', 'កត់ត្រាម៉ោងចូល']],
    en: 'Employees can clock in using the Click HR mobile app. Supported fingerprint and face-scan devices are also available for attendance.',
    km: 'បុគ្គលិកអាចកត់ត្រាម៉ោងចូលតាមកម្មវិធី Click HR។ ក៏អាចប្រើឧបករណ៍ស្កេនម្រាមដៃ ឬស្កេនមុខដែលគាំទ្រ។',
    steps: iOSSteps(clickHrGuides.clockIn),
  },
  {
    id: 'attendance-reports', topic: 'attendance', title: 'Deliver daily attendance reports',
    terms: [['report', 'reports', 'summary', 'របាយការណ៍', 'សេចក្តីសង្ខេប'],
      ['attendance', 'clock ins', 'arrivals', 'វត្តមាន']],
    url: attendance,
    en: 'Click HR’s attendance module lists Telegram and email as delivery options for daily attendance reports. Ask your company’s administrator which channels are enabled for your organization.',
    km: 'ម៉ូឌុលវត្តមានរបស់ Click HR អាចផ្ញើរបាយការណ៍វត្តមានប្រចាំថ្ងៃតាម Telegram និងអ៊ីមែល។ សូមសួរអ្នកគ្រប់គ្រងរបស់ក្រុមហ៊ុនអ្នកថាបានបើកជម្រើសណាខ្លះ។',
  },
  {
    id: 'payroll-bank-export', topic: 'payroll', title: 'Prepare a payroll payment file for a bank',
    url: `${modules}payroll-system-cambodia/`,
    terms: [['bank', 'banking', 'ធនាគារ'],
      ['salary', 'salaries', 'payroll', 'payment file', 'payout file', 'ប្រាក់ខែ', 'ឯកសារបង់ប្រាក់']],
    en: 'Click HR’s payroll module can prepare bank payment files. Ask Click HR to confirm the format your bank requires.',
    km: 'ម៉ូឌុលបញ្ជីប្រាក់ខែរបស់ Click HR អាចរៀបចំឯកសារបង់ប្រាក់សម្រាប់ធនាគារ។ សូមឱ្យ Click HR បញ្ជាក់ទម្រង់ឯកសារដែលធនាគាររបស់អ្នកត្រូវការ។',
  },
  {
    id: 'mobile-payslip', topic: 'mobile', title: 'View employee payslips on mobile', url: mobile,
    terms: [['payslip', 'payslips', 'pay slip', 'pay slips', 'wage slip', 'wage slips', 'pay stub', 'pay stubs', 'បង្កាន់ដៃប្រាក់ខែ'],
      ['mobile', 'phone', 'phones', 'smartphone', 'app', 'ios', 'android', 'ទូរស័ព្ទ']],
    en: 'Employees can view payslips in the Click HR mobile app. If a payslip is missing, ask your company’s HR team to check it.',
    km: 'បុគ្គលិកអាចមើលបង្កាន់ដៃប្រាក់ខែក្នុងកម្មវិធី Click HR លើទូរស័ព្ទ។ បើមិនឃើញបង្កាន់ដៃ សូមសួរផ្នែកធនធានមនុស្សរបស់ក្រុមហ៊ុនអ្នក។',
  },
  {
    id: 'employee-document-expiry', topic: 'employees', title: 'Get reminders when employee documents expire',
    url: `${modules}employee-management-cambodia/`,
    terms: [['employee', 'employees', 'staff', 'hr', 'បុគ្គលិក', 'ធនធានមនុស្ស'],
      ['document', 'documents', 'certificate', 'certificates', 'ឯកសារ'],
      ['expiry', 'expire', 'expires', 'expiring', 'expiration', 'renewal', 'renew', 'ផុតកំណត់']],
    en: 'Click HR’s employee module can alert HR when employee documents are approaching expiry.',
    km: 'ម៉ូឌុលគ្រប់គ្រងបុគ្គលិករបស់ Click HR អាចជូនដំណឹងដល់ផ្នែកធនធានមនុស្សពេលឯកសារបុគ្គលិកជិតផុតកំណត់។',
  },
  {
    id: 'overtime-request', topic: 'attendance', title: 'Submit an overtime request on mobile', url: mobile,
    terms: [['ot', 'overtime', 'extra hours', 'ថែមម៉ោង'], ['request', 'requests', 'submit', 'apply', 'ask for', 'ស្នើ', 'ដាក់សំណើ']],
    en: 'Employees can submit overtime requests in the Click HR mobile app.',
    km: 'បុគ្គលិកអាចដាក់សំណើធ្វើការថែមម៉ោងក្នុងកម្មវិធី Click HR លើទូរស័ព្ទ។',
  },
];
