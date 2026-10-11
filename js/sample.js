/* Rolo — fictional sample contacts. All people and companies are made up. */
'use strict';

function buildSampleContacts() {
  const now = new Date();
  const ago = (n, h = 10) => { const d = addDays(now, -n); d.setHours(h, 15, 0, 0); return d.toISOString(); };
  const dIn = (n) => ymd(addDays(now, n));
  const mdIn = (n) => { const d = addDays(now, n); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const asOf = (n) => ymd(addDays(now, -n));
  const T = (n, type, note) => ({ id: uid('t'), type, date: ago(n, 9 + (n % 8)), note });
  const P = (value, label = 'Mobile') => ({ label, value });
  const E = (value, label = 'Work') => ({ label, value });
  const A = (street, city, state, zip) => ({ street, city, state, zip });
  const mk = (o) => normalizeContact({ ...blankContact(), ...o });

  const list = [
    mk({ id: 's-hale', firstName: 'Marcus', lastName: 'Hale', company: 'Bluestem Manufacturing', title: 'CFO',
      phones: [P('9185550142'), P('9185550100', 'Office')], emails: [E('mhale@bluestem-mfg.example')],
      address: A('4100 Industrial Pkwy', 'Tulsa', 'OK', '74107'), linkedin: 'linkedin.com/in/marcushale-example',
      groupIds: ['g-clients'], tags: ['manufacturing', 'decision maker'],
      prefs: { method: 'call', bestTime: 'Before 9am or after 4pm', timezone: '' },
      nextStep: { text: 'Send renewal options for the fleet policy', due: dIn(-2) },
      pinned: ['Prefers bullet-point emails, no attachments', 'OSU alum — never mention OU on game week'],
      spouse: { name: 'Dana', notes: 'Runs a pottery studio downtown' }, anniversary: mdIn(19),
      kids: [{ id: uid('k'), name: 'Caleb', age: 14, ageAsOf: asOf(200) }, { id: uid('k'), name: 'Lily', age: 9, ageAsOf: asOf(200) }],
      pets: [{ id: uid('p'), name: 'Biscuit', kind: 'Golden retriever' }],
      hobbies: ['Bass fishing', 'Smoking brisket', 'OSU football'], favoriteTreat: 'Peanut brittle', giftIdeas: 'Anything for the smoker — rubs, wood chips',
      gifts: [{ id: uid('g'), date: asOf(300), item: 'Bag of post-oak wood chunks', occasion: 'Holiday' }],
      birthday: mdIn(4), keyDates: [{ id: uid('d'), label: 'Fleet policy renewal', date: dIn(41), recurring: true }],
      metAt: 'Tulsa Chamber breakfast', referredBy: 's-ortiz', favorite: true,
      touches: [T(18, 'call', 'Talked through fleet renewal. Two new trucks coming in Q1. Caleb made varsity baseball.'), T(46, 'meeting', 'Lunch on Cherry Street. Wants a second look at umbrella limits.'), T(95, 'email', 'Sent benchmarking report.')],
      custom: [{ id: uid('f'), label: 'Employees', value: '140' }, { id: uid('f'), label: 'Current carrier', value: 'Plains Mutual' }] }),

    mk({ id: 's-ortiz', firstName: 'Elena', lastName: 'Ortiz', company: 'Ortiz & Reed CPAs', title: 'Managing Partner',
      phones: [P('9185550177')], emails: [E('elena@ortizreed.example')], address: A('', 'Broken Arrow', 'OK', ''),
      groupIds: ['g-partners', 'g-coi'], tags: ['CPA', 'referrals'], prefs: { method: 'text', bestTime: 'Lunch hour', timezone: '' },
      nextStep: { text: 'Thank-you note for the Hale referral', due: dIn(0) },
      pinned: ['Sent 4 referrals this year — top partner'], spouse: { name: 'Raymond' },
      kids: [{ id: uid('k'), name: 'Sofia', age: 22, ageAsOf: asOf(100) }],
      hobbies: ['Half marathons', 'Wine club'], favoriteTreat: 'Dark chocolate sea salt caramels', giftIdeas: 'Running gear, nice pinot',
      gifts: [{ id: uid('g'), date: asOf(160), item: 'Bottle of Willamette pinot', occasion: 'Referral thank-you' }],
      birthday: mdIn(62), metAt: 'BNI chapter', favorite: true,
      touches: [T(6, 'text', 'Heads up she\'s sending over a dental practice owner.'), T(33, 'meeting', 'Coffee downtown. Tax season is her blackout — Feb to April 15.')] }),

    mk({ id: 's-nguyen', firstName: 'David', lastName: 'Nguyen', company: 'Red Dirt Logistics', title: 'Owner',
      phones: [P('4055550133')], emails: [E('david@reddirtlogistics.example')], address: A('', 'Oklahoma City', 'OK', ''),
      groupIds: ['g-prospects'], tags: ['transportation', 'hot lead'], prefs: { method: 'call', bestTime: 'Mornings', timezone: '' },
      nextStep: { text: 'Follow up on cargo quote', due: dIn(1) }, pinned: ['Burned by last broker on a claim — lead with service'],
      spouse: { name: 'Mai' }, kids: [{ id: uid('k'), name: 'Ethan', age: 6, ageAsOf: asOf(40) }, { id: uid('k'), name: 'Grace', age: 3, ageAsOf: asOf(40) }],
      hobbies: ['Golf', 'Thunder basketball'], favoriteTreat: 'Banh mi from his mom\'s shop', metAt: 'Referred at trucking expo',
      touches: [T(3, 'call', 'Discovery call. 22 trucks, renewal 1/1. Sending cargo quote by Friday.')] }),

    mk({ id: 's-brooks', firstName: 'Tasha', lastName: 'Brooks', company: 'Prairie Fire Builders', title: 'VP Operations',
      phones: [P('9185550190')], emails: [E('tbrooks@prairiefire.example')], address: A('', 'Tahlequah', 'OK', ''), linkedin: 'tasha-brooks-example',
      groupIds: ['g-clients'], tags: ['construction'], prefs: { method: 'email', bestTime: '', timezone: '' },
      nextStep: { text: 'Schedule safety program review', due: dIn(6) },
      spouse: { name: 'Jerome' }, anniversary: mdIn(2),
      kids: [{ id: uid('k'), name: 'Mia', age: 11, ageAsOf: asOf(365), birthday: mdIn(25) }],
      pets: [{ id: uid('p'), name: 'Pepper', kind: 'Cat' }],
      hobbies: ['Kayaking the Illinois River', 'Gardening'], favoriteTreat: 'Lemon bars', birthday: mdIn(120),
      touches: [T(21, 'email', 'Sent certificate of insurance for the new job site.'), T(55, 'call', 'Discussed builder\'s risk for the hospital wing project.')] }),

    mk({ id: 's-patel', firstName: 'Raj', lastName: 'Patel', company: 'Riverbend Hospitality', title: 'Director of Finance',
      phones: [P('4795550118')], emails: [E('rpatel@riverbend.example')], address: A('', 'Fayetteville', 'AR', ''),
      groupIds: ['g-clients'], tags: ['hospitality', 'benefits'],
      nextStep: { text: 'Open enrollment kickoff meeting', due: dIn(12) },
      spouse: { name: 'Priya' }, kids: [{ id: uid('k'), name: 'Arjun', age: 16, ageAsOf: asOf(500) }],
      hobbies: ['Cricket', 'Razorback baseball'], favoriteTreat: 'Masala chai', birthday: mdIn(9),
      touches: [T(64, 'meeting', 'Benefits renewal review. Wants to add a wellness stipend.')] }),

    mk({ id: 's-walker', firstName: 'Jenna', lastName: 'Walker', company: 'Walker Family Dental', title: 'DDS, Owner',
      phones: [P('9185550121')], emails: [E('drwalker@walkerdental.example')], address: A('', 'Muskogee', 'OK', ''),
      groupIds: ['g-prospects'], tags: ['healthcare', 'referral from Elena'], referredBy: 's-ortiz',
      nextStep: { text: 'Intro call — practice + malpractice review', due: dIn(2) },
      hobbies: ['Pilates'], metAt: 'Referral from Elena Ortiz', touches: [T(5, 'email', 'Intro email via Elena. Asked for a call next week.')] }),

    mk({ id: 's-kim', firstName: 'Andrew', lastName: 'Kim', company: 'Summit Carrier Group', title: 'Regional Underwriter',
      phones: [P('2145550166', 'Work')], emails: [E('akim@summitcarrier.example')], address: A('', 'Dallas', 'TX', ''),
      groupIds: ['g-vendors'], tags: ['underwriter', 'commercial auto'],
      hobbies: ['Cycling'], favoriteTreat: 'Cold brew', touches: [T(40, 'call', 'Pushed back on the Hale fleet rate. Can move 6% with telematics.')] }),

    mk({ id: 's-reyes', firstName: 'Carmen', lastName: 'Reyes', company: 'Green Country Realty', title: 'Broker',
      phones: [P('9185550155')], emails: [E('carmen@gcrealty.example')], address: A('', 'Tulsa', 'OK', ''),
      groupIds: ['g-partners'], tags: ['real estate', 'personal lines referrals'],
      nextStep: { text: 'Drop off cookies for her office', due: dIn(-6) },
      spouse: { name: 'Luis' }, kids: [{ id: uid('k'), name: 'Mateo', age: 8, ageAsOf: asOf(90) }, { id: uid('k'), name: 'Isabella', age: 12, ageAsOf: asOf(90) }],
      hobbies: ['Salsa dancing', 'Home flipping'], favoriteTreat: 'Tres leches', birthday: mdIn(45),
      touches: [T(80, 'meeting', 'Lunch. She\'ll send new homebuyers our way for home + auto quotes.')] }),

    mk({ id: 's-thompson', firstName: 'Bill', lastName: 'Thompson', company: 'Thompson Ag Supply', title: 'President',
      phones: [P('9185550109'), P('9185550110', 'Home')], emails: [E('bill@thompsonag.example')], address: A('Rt 2 Box 114', 'Stilwell', 'OK', '74960'),
      groupIds: ['g-clients'], tags: ['agriculture', 'farm & ranch'], prefs: { method: 'call', bestTime: 'Early — he\'s up at 5', timezone: '' },
      pinned: ['Does not text. Call or stop by.'], spouse: { name: 'Margaret' }, anniversary: mdIn(160),
      kids: [{ id: uid('k'), name: 'Wade', age: 34, ageAsOf: asOf(700) }],
      pets: [{ id: uid('p'), name: 'Duke', kind: 'Blue heeler' }],
      hobbies: ['Cattle', 'Quail hunting', 'Gospel bluegrass'], favoriteTreat: 'Strawberry rhubarb pie', birthday: mdIn(14),
      touches: [T(120, 'meeting', 'Farm visit. New hay barn needs to be added to the policy.')] }),

    mk({ id: 's-chen', firstName: 'Olivia', lastName: 'Chen', company: 'Lumen Health Partners', title: 'HR Director',
      phones: [P('9185550186')], emails: [E('ochen@lumenhealth.example')], address: A('', 'Tulsa', 'OK', ''), linkedin: 'olivia-chen-hr-example',
      groupIds: ['g-clients'], tags: ['benefits', 'healthcare'],
      nextStep: { text: 'Send updated plan comparison', due: dIn(3) },
      kids: [{ id: uid('k'), name: 'Noah', age: 5, ageAsOf: asOf(30) }], hobbies: ['Yoga', 'Book club'], favoriteTreat: 'Matcha anything',
      touches: [T(9, 'call', 'Open enrollment questions. Employees confused about HSA vs FSA — offered a lunch-and-learn.'), T(37, 'email', 'Renewal numbers sent.')] }),

    mk({ id: 's-morgan', firstName: 'Grant', lastName: 'Morgan', company: 'Redbud Ridge Golf Club', title: 'General Manager',
      phones: [P('9185550147')], emails: [E('gmorgan@redbudridge.example')], address: A('', 'Tahlequah', 'OK', ''),
      groupIds: ['g-coi'], tags: ['golf', 'connector'], hobbies: ['Golf (2 handicap)', 'Fly fishing'],
      favoriteTreat: 'Bourbon — Weller', pinned: ['Knows every business owner in town'],
      touches: [T(70, 'meeting', 'Played 9. Offered to host a client appreciation scramble in spring.')] }),

    mk({ id: 's-alvarez', firstName: 'Sam', lastName: 'Alvarez', company: 'Alvarez Auto Body', title: 'Owner',
      phones: [P('9185550125')], emails: [E('sam@alvarezauto.example')], address: A('', 'Claremore', 'OK', ''),
      groupIds: ['g-prospects'], tags: ['garage', 'BOP'],
      nextStep: { text: 'Quote garage keepers coverage', due: dIn(-1) },
      spouse: { name: 'Rosa' }, kids: [{ id: uid('k'), name: 'Diego', age: 17, ageAsOf: asOf(20) }],
      hobbies: ['Lowriders', 'Car shows'], touches: [T(12, 'call', 'Interested. Wants a quote before his renewal on the 1st.')] }),

    mk({ id: 's-baker', firstName: 'Hannah', lastName: 'Baker', company: 'Baker Street Bakery', title: 'Owner',
      phones: [P('9185550164')], emails: [E('hannah@bakerstreet.example', 'Personal')], address: A('', 'Tahlequah', 'OK', ''),
      groupIds: ['g-clients', 'g-personal'], tags: ['small business'], hobbies: ['Sourdough', 'Trail running'],
      favoriteTreat: 'Pour-over from a local roaster', birthday: mdIn(6),
      kids: [{ id: uid('k'), name: 'Ruby', age: 2, ageAsOf: asOf(60) }],
      touches: [T(28, 'text', 'Congrats on the second location!')] }),

    mk({ id: 's-foster', firstName: 'Kevin', lastName: 'Foster', company: 'Foster Wealth Advisors', title: 'Financial Advisor',
      phones: [P('9185550173')], emails: [E('kfoster@fosterwealth.example')], address: A('', 'Tulsa', 'OK', ''), linkedin: 'kevin-foster-cfp-example',
      groupIds: ['g-partners'], tags: ['financial advisor', 'life & disability'],
      nextStep: { text: 'Co-host estate planning lunch & learn', due: dIn(20) },
      spouse: { name: 'Amy' }, hobbies: ['Hunting', 'Church softball'], favoriteTreat: 'Beef jerky',
      touches: [T(15, 'meeting', 'Agreed to co-host a seminar for business owners.')] }),

    mk({ id: 's-iverson', firstName: 'Laura', lastName: 'Iverson', company: 'Northgate School District', title: 'Business Manager',
      phones: [P('9185550138', 'Work')], emails: [E('liverson@northgate.example')], address: A('', 'Owasso', 'OK', ''),
      groupIds: ['g-prospects'], tags: ['public entity', 'RFP'],
      keyDates: [{ id: uid('d'), label: 'RFP due', date: dIn(9), recurring: false }],
      touches: [T(50, 'email', 'RFP announced for property & casualty.')] }),

    mk({ id: 's-jackson', firstName: 'Marcus', lastName: 'Jackson', nickname: 'MJ', company: 'Arrowhead Electric', title: 'Owner',
      phones: [P('9185550194')], emails: [E('mj@arrowheadelectric.example')], address: A('', 'Wagoner', 'OK', ''),
      groupIds: ['g-clients'], tags: ['contractor'], kids: [{ id: uid('k'), name: 'Jordan', age: 10, ageAsOf: asOf(120) }, { id: uid('k'), name: 'Kendall', age: 7, ageAsOf: asOf(120) }],
      hobbies: ['Coaching youth football'], favoriteTreat: 'Whataburger', touches: [T(140, 'call', 'Annual review. Added a bucket truck.')] }),

    mk({ id: 's-lane', firstName: 'Brianna', lastName: 'Lane', company: 'Lane Veterinary Clinic', title: 'DVM',
      phones: [P('9185550112')], emails: [E('drlane@lanevet.example')], address: A('', 'Tahlequah', 'OK', ''),
      groupIds: ['g-clients'], tags: ['veterinary'], pets: [{ id: uid('p'), name: 'Moose', kind: 'Great Dane' }, { id: uid('p'), name: 'Olive', kind: 'Rescue mutt' }],
      hobbies: ['Horseback riding'], favoriteTreat: 'Iced oat latte', birthday: mdIn(90),
      touches: [T(42, 'text', 'Sent photo of Moose at the clinic open house.')] }),

    mk({ id: 's-ward', firstName: 'Chris', lastName: 'Ward', company: 'Ward Insurance Partners', title: 'Wholesale Broker',
      phones: [P('8165550157', 'Work')], emails: [E('cward@wardip.example')], address: A('', 'Kansas City', 'MO', ''),
      groupIds: ['g-vendors'], tags: ['wholesaler', 'E&S'], hobbies: ['Chiefs football', 'BBQ'],
      touches: [T(25, 'email', 'Placed the auto body risk with an E&S market.')] }),

    mk({ id: 's-young', firstName: 'Natalie', lastName: 'Young', company: 'Young & Co. Marketing', title: 'Founder',
      phones: [P('9185550181')], emails: [E('natalie@youngco.example')], address: A('', 'Tulsa', 'OK', ''), linkedin: 'natalieyoung-example',
      groupIds: ['g-personal', 'g-coi'], tags: ['marketing', 'friend'], spouse: { name: 'Ben' },
      hobbies: ['Pickleball', 'Thrift flipping'], favoriteTreat: 'Sour gummy worms', birthday: mdIn(30),
      touches: [T(8, 'text', 'Pickleball Thursday?')] }),

    mk({ id: 's-dawson', firstName: 'Ray', lastName: 'Dawson', company: 'Dawson Oil Field Services', title: 'COO',
      phones: [P('5805550149')], emails: [E('rdawson@dawsonofs.example')], address: A('', 'Enid', 'OK', ''),
      groupIds: ['g-prospects'], tags: ['energy'], pinned: ['Loves golf — invite him to the club scramble'], hobbies: ['Golf', 'Hunting'],
      touches: [T(75, 'meeting', 'Met at energy conference. Unhappy with current workers comp mod.')] }),

    mk({ id: 's-ellis', firstName: 'Megan', lastName: 'Ellis', company: 'Ellis Family', title: '',
      phones: [P('9185550116')], emails: [E('megan.ellis@mail.example', 'Personal')], address: A('', 'Tahlequah', 'OK', ''),
      groupIds: ['g-personal'], tags: ['personal lines'], spouse: { name: 'Tyler' },
      kids: [{ id: uid('k'), name: 'Avery', age: 4, ageAsOf: asOf(10) }], pets: [{ id: uid('p'), name: 'Scout', kind: 'Beagle' }],
      hobbies: ['Camping', 'Lake days'], keyDates: [{ id: uid('d'), label: 'Home & auto renewal', date: dIn(17), recurring: true }],
      touches: [T(200, 'call', 'Bundled home + auto. Teen driver in ~10 years, ha.')] }),

    mk({ id: 's-fischer', firstName: 'Paul', lastName: 'Fischer', company: 'Fischer Precision Machining', title: 'Plant Manager',
      phones: [P('9185550127')], emails: [E('pfischer@fischerpm.example')], address: A('', 'Sand Springs', 'OK', ''),
      groupIds: ['g-clients'], tags: ['manufacturing', 'safety'], hobbies: ['Woodworking'], favoriteTreat: 'Pecan pralines',
      touches: [T(32, 'meeting', 'Safety committee meeting. Two recordables this year — loss control visit scheduled.')] }),

    mk({ id: 's-garcia', firstName: 'Ana', lastName: 'Garcia', company: 'Sunrise Senior Living', title: 'Executive Director',
      phones: [P('4055550172')], emails: [E('agarcia@sunrise-sl.example')], address: A('', 'Norman', 'OK', ''),
      groupIds: ['g-prospects'], tags: ['senior living', 'professional liability'],
      nextStep: { text: 'Send case study on abuse & molestation coverage', due: dIn(4) },
      kids: [{ id: uid('k'), name: 'Lucas', age: 13, ageAsOf: asOf(150) }], hobbies: ['Choir'],
      touches: [T(10, 'call', 'Board meets in 3 weeks — needs proposal before then.')] }),

    mk({ id: 's-owens', firstName: 'Derek', lastName: 'Owens', company: 'Tahlequah Youth Sports League', title: 'Executive Director',
      phones: [P('9185550198')], emails: [E('dowens@tysl.example')], address: A('', 'Tahlequah', 'OK', ''),
      groupIds: ['g-coi'], tags: ['community', 'sponsorship'], hobbies: ['Basketball', 'Grilling'],
      touches: [T(100, 'meeting', 'Talked about sponsoring the spring golf scramble.')] }),

    mk({ id: 's-vance', firstName: 'Hollis', lastName: 'Vance', company: 'Vance Trucking', title: 'Owner (retired)',
      phones: [P('9185550103', 'Home')], emails: [], address: A('', 'Park Hill', 'OK', ''),
      groupIds: ['g-personal', 'g-coi'], tags: ['mentor'], pinned: ['Introduced you to half of Cherokee County'],
      hobbies: ['Restoring tractors', 'Pecan orchard'], favoriteTreat: 'Fried pies', birthday: mdIn(1),
      touches: [T(160, 'call', 'Checked in. Says to come get pecans in November.')] })
  ];

  // relationships
  const byId = Object.fromEntries(list.map((c) => [c.id, c]));
  byId['s-hale'].connections.push({ contactId: 's-kim', relation: 'Underwriter on his account' });
  byId['s-ortiz'].connections.push({ contactId: 's-foster', relation: 'Shares clients' });
  byId['s-morgan'].connections.push({ contactId: 's-dawson', relation: 'Golf buddy' });
  byId['s-vance'].connections.push({ contactId: 's-thompson', relation: 'Old friends' });
  byId['s-alvarez'].referredBy = 's-vance';
  return list;
}
