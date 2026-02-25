export const metadata = {
  title: 'Privacy Policy - Wasel',
  description: 'Privacy Policy for Wasel ride-hailing platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: February 25, 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900">1. Introduction</h2>
            <p>
              Wasel ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-gray-800 mt-4">2.1 Personal Information</h3>
            <p>We collect information you provide directly, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, and phone number</li>
              <li>Profile photo</li>
              <li>Payment information (credit/debit card details)</li>
              <li>Driver's license and vehicle information (for drivers)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mt-4">2.2 Location Data</h3>
            <p>
              We collect precise location data from your device when the App is in use to provide ride-hailing services. This includes pickup and drop-off locations, and real-time location during rides.
            </p>

            <h3 className="text-xl font-medium text-gray-800 mt-4">2.3 Usage Data</h3>
            <p>We automatically collect information about your use of the App, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information (model, operating system, unique identifiers)</li>
              <li>App usage patterns and preferences</li>
              <li>Ride history and transaction records</li>
              <li>Communication data (in-app messages between riders and drivers)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our ride-hailing services</li>
              <li>Process payments and transactions</li>
              <li>Match riders with nearby drivers</li>
              <li>Send ride confirmations, receipts, and service notifications</li>
              <li>Ensure safety and security for all users</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce our Terms of Service</li>
              <li>Improve our App and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">4. Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Drivers/Riders:</strong> Your name, pickup/drop-off location, and phone number are shared with your matched driver or rider to facilitate the ride</li>
              <li><strong>Payment Processors:</strong> Payment details are shared with our payment partners to process transactions</li>
              <li><strong>Service Providers:</strong> We may share data with third-party providers who help us operate the App (hosting, analytics, customer support)</li>
              <li><strong>Law Enforcement:</strong> We may disclose information when required by law or to protect the safety of our users</li>
            </ul>
            <p>
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption, secure servers, and access controls.
            </p>
            <p>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services. We may retain certain information for legitimate business purposes, such as fraud prevention, or as required by law.
            </p>
            <p>
              Ride history and transaction records are retained for a minimum period as required by applicable regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and personal data</li>
              <li>Opt out of promotional communications</li>
              <li>Withdraw consent for location tracking (note: this may limit App functionality)</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at support@waselapp.qa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">8. Children's Privacy</h2>
            <p>
              Our App is not intended for use by children under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">9. Third-Party Services</h2>
            <p>
              The App may use third-party services such as Google Maps for navigation and mapping. These services have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes through the App or via email. Your continued use of the App after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="font-medium">
              Email: support@waselapp.qa
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} Wasel. All rights reserved.
        </div>
      </div>
    </div>
  );
}
