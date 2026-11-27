const site = 'https://www.clickhr.app';
const source = (path) => site + path;
const faq = (id, title, tags, en, km, path) => ({ id, title, tags, en, km, url: source(path) });

export const clickhr = {
  slug: 'clickhr',
  name: 'Click HR',
  summary: 'HR, payroll and attendance for Cambodian businesses',
  website: site,
  contactUrl: source('/contact-us/'),
  meetingUrl: source('/booking-demo/'),
  meetingEnabled: true,
  pricingPolicy: 'meeting',
  welcomeEn: 'Hi! I’m the Click HR assistant. Ask me about payroll, attendance, leave, or how to get started.',
  welcomeKm: 'សួស្តី! ខ្ញុំជាជំនួយការរបស់ Click HR។ អ្នកអាចសួរអំពីបញ្ជីប្រាក់ខែ វត្តមាន ការឈប់សម្រាក ឬរបៀបចាប់ផ្ដើមប្រើប្រាស់។',
  faqs: [
    faq('overview', 'Product overview', ['what does click hr do', 'what does clickhr do', 'what is click hr', 'what is clickhr', 'about click hr', 'about clickhr', 'what do you do', 'product features', 'features', 'modules', 'hr system', 'erp', 'មុខងារ', 'ប្រព័ន្ធអ្វី'],
      'Click HR is a cloud-based HR and payroll platform for businesses in Cambodia. It brings employee records, payroll, attendance and leave into one place and supports Khmer and English.',
      'Click HR ជាប្រព័ន្ធគ្រប់គ្រងធនធានមនុស្ស និងបញ្ជីប្រាក់ខែតាមអ៊ីនធឺណិត សម្រាប់អាជីវកម្មនៅកម្ពុជា។ វារួមបញ្ចូលទិន្នន័យបុគ្គលិក បញ្ជីប្រាក់ខែ វត្តមាន និងការឈប់សម្រាក ហើយគាំទ្រភាសាខ្មែរ និងអង់គ្លេស។', '/'),
    faq('payroll', 'Payroll and NSSF', ['payroll', 'salary', 'nssf', 'e filing', 'tax', 'seniority', 'bank payment', 'salary tax', 'បញ្ជីប្រាក់ខែ', 'ប្រាក់ខែ', 'បេឡា', 'បសស', 'ពន្ធ'],
      'Click HR’s payroll module supports payroll calculations, allowances, bonuses, overtime, seniority, NSSF, tax e-filing, payslips and bank payment files.',
      'ម៉ូឌុលបញ្ជីប្រាក់ខែរបស់ Click HR គាំទ្រការគណនាប្រាក់ខែ ប្រាក់ឧបត្ថម្ភ ប្រាក់រង្វាន់ ប្រាក់ថែមម៉ោង អតីតភាព ប.ស.ស. ការដាក់ឯកសារពន្ធអេឡិចត្រូនិក បង្កាន់ដៃប្រាក់ខែ និងឯកសារបង់ប្រាក់តាមធនាគារ។', '/modules/payroll-system-cambodia/'),
    faq('attendance', 'Attendance and shifts', ['attendance', 'clock in', 'clock out', 'time tracking', 'fingerprint', 'face scan', 'biometric', 'roster', 'shift', 'shifts', 'overtime', 'late', 'វត្តមាន', 'ស្កេនម្រាមដៃ', 'ស្កេនមុខ', 'វេន', 'ថែមម៉ោង'],
      'Staff can clock in and out with the Click HR mobile app or supported fingerprint and face-scan devices. The attendance module also covers shifts, rosters, overtime, and late arrivals or early departures. Ask the team to confirm compatibility with your devices.',
      'បុគ្គលិកអាចកត់ត្រាម៉ោងចូល និងចេញតាមកម្មវិធីទូរស័ព្ទ ឬឧបករណ៍ស្កេនម្រាមដៃ និងស្កេនមុខដែលគាំទ្រ។ ម៉ូឌុលវត្តមានក៏គាំទ្រវេន កាលវិភាគ ម៉ោងបន្ថែម ការមកយឺត និងការចេញមុនម៉ោង។ សូមសួរក្រុមការងារអំពីភាពឆបគ្នាជាមួយឧបករណ៍របស់អ្នក។', '/modules/attendance-management-cambodia/'),
    faq('leave', 'Leave management', ['leave', 'vacation', 'annual leave', 'sick leave', 'unpaid leave', 'day off', 'time off', 'approval', 'ឈប់សម្រាក', 'ច្បាប់ឈប់', 'សុំច្បាប់'],
      'Click HR tracks annual, sick, special and unpaid leave. The mobile app supports leave requests and approvals.',
      'Click HR តាមដានការឈប់សម្រាកប្រចាំឆ្នាំ ការឈប់ពេលឈឺ ការឈប់ពិសេស និងការឈប់ដោយមិនទទួលប្រាក់ខែ។ អ្នកអាចស្នើសុំ និងអនុម័តការឈប់សម្រាកតាមកម្មវិធីទូរស័ព្ទ។', '/modules/leave-management-cambodia/'),
    faq('employees', 'Employee records', ['employee records', 'employee management', 'employee data', 'employee contract', 'contracts', 'employee documents', 'organization chart', 'assets', 'កិច្ចសន្យា', 'ឯកសារបុគ្គលិក', 'ទិន្នន័យបុគ្គលិក'],
      'The employee module centralizes employee information, documents, contracts, departments, organization charts and staff assets. It also includes expiry alerts for employee documents and alerts for contracts.',
      'ម៉ូឌុលបុគ្គលិករួមបញ្ចូលព័ត៌មានបុគ្គលិក ឯកសារ កិច្ចសន្យា នាយកដ្ឋាន រចនាសម្ព័ន្ធអង្គភាព និងទ្រព្យសម្បត្តិដែលប្រគល់ឱ្យបុគ្គលិក។ វាក៏មានការជូនដំណឹងអំពីឯកសារជិតផុតកំណត់ និងកិច្ចសន្យា។', '/modules/employee-management-cambodia/'),
    faq('mobile', 'Mobile app and payslips', ['mobile app', 'mobile', 'phone app', 'payslip', 'payslips', 'digital payslip', 'public documents', 'កម្មវិធីទូរស័ព្ទ', 'បង្កាន់ដៃប្រាក់ខែ'],
      'Employees can use the Click HR mobile app to clock in and out, request leave or overtime, view payslips, and access public documents.',
      'បុគ្គលិកអាចប្រើកម្មវិធី Click HR លើទូរស័ព្ទ ដើម្បីកត់ត្រាម៉ោងចូល និងចេញ ស្នើសុំឈប់សម្រាក ឬធ្វើការថែមម៉ោង មើលបង្កាន់ដៃប្រាក់ខែ និងចូលមើលឯកសារសាធារណៈ។', '/modules/hr-mobile-app-cambodia/'),
    faq('contact', 'Contact and support', ['contact', 'support', 'phone number', 'email', 'address', 'location', 'help desk', 'ទំនាក់ទំនង', 'លេខទូរស័ព្ទ', 'អ៊ីមែល', 'ទីតាំង'],
      'Contact Click HR at hello@clickhr.app or +855 93 900 052. The contact page also lists the office address in Koh Pich, Phnom Penh.',
      'អ្នកអាចទាក់ទង Click HR តាមអ៊ីមែល hello@clickhr.app ឬលេខ +855 93 900 052។ ទំព័រទំនាក់ទំនងមានអាសយដ្ឋានការិយាល័យនៅកោះពេជ្រ រាជធានីភ្នំពេញ។', '/contact-us/'),
  ],
};
