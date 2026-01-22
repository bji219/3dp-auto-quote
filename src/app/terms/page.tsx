import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - IDW3D',
  description: 'Terms of Service for IDW3D 3D printing services',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12">
          {/* Legal Disclaimer */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-yellow-900 mb-2 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              PLACEHOLDER - LEGAL REVIEW REQUIRED
            </h2>
            <p className="text-yellow-800 text-sm">
              <strong>IMPORTANT NOTICE:</strong> This Terms of Service document is a DRAFT TEMPLATE and has NOT been reviewed by a licensed attorney.
              It is provided as a placeholder only. Before using this website for commercial purposes, you MUST:
            </p>
            <ul className="list-disc ml-6 mt-2 text-yellow-800 text-sm space-y-1">
              <li>Have this document reviewed and modified by a Pennsylvania-licensed business attorney</li>
              <li>Ensure compliance with Pennsylvania state law and federal regulations</li>
              <li>Customize terms specific to your business operations and risk tolerance</li>
              <li>Consider obtaining business liability insurance</li>
            </ul>
            <p className="text-yellow-800 text-sm mt-2 font-semibold">
              Use of this template without proper legal review is AT YOUR OWN RISK.
            </p>
          </div>

          {/* Header */}
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Terms of Service</h1>
          <p className="text-gray-600 mb-8">
            Last Updated: January 22, 2026
          </p>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* 1. Agreement to Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the IDW3D 3D printing quote and ordering system (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                If you do not agree to these Terms, you may not use the Service.
              </p>
              <p className="text-gray-700 mb-4">
                These Terms constitute a legally binding agreement between you (&quot;Customer,&quot; &quot;you,&quot; or &quot;your&quot;) and
                Intelligent Design Works Limited, a Pennsylvania Limited Liability Company (&quot;IDW3D,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              </p>
            </section>

            {/* 2. Service Description */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Service Description</h2>
              <p className="text-gray-700 mb-4">
                IDW3D provides custom 3D printing services. Customers upload STL files through our website, receive automated pricing quotes,
                and may place orders for 3D printed objects. Our services include:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Automated analysis of STL files and generation of price quotes</li>
                <li>3D printing using various materials (primarily PLA, ABS, PETG, and other thermoplastics)</li>
                <li>Multiple quality levels (draft, standard, and high quality)</li>
                <li>Optional rush order processing</li>
                <li>Shipping of completed prints to customer-provided addresses</li>
              </ul>
            </section>

            {/* 3. Quote Process and Pricing */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Quote Process and Pricing</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Quote Validity</h3>
              <p className="text-gray-700 mb-4">
                All quotes are valid for seven (7) days from the date of generation. After this period, prices may change,
                and a new quote must be requested.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Pricing Factors</h3>
              <p className="text-gray-700 mb-4">
                Quotes are automatically calculated based on multiple factors including but not limited to:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Model volume and surface area</li>
                <li>Selected material type</li>
                <li>Print quality level</li>
                <li>Infill percentage</li>
                <li>Rush order premium (if selected)</li>
                <li>Estimated printing time and material costs</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Quote Accuracy</h3>
              <p className="text-gray-700 mb-4">
                While we strive for accuracy, automated quotes are estimates. We reserve the right to adjust pricing if,
                upon manual review, we discover significant discrepancies in the automated analysis. If an adjustment exceeds 10% of the quoted price,
                we will contact you for approval before proceeding.
              </p>
            </section>

            {/* 4. Payment Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Payment Terms</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Payment Processing</h3>
              <p className="text-gray-700 mb-4">
                Payment is required in full before printing begins. We accept credit cards and other payment methods processed through
                Stripe, our third-party payment processor. By providing payment information, you authorize us to charge the quoted amount
                to your selected payment method.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Payment Security</h3>
              <p className="text-gray-700 mb-4">
                We do not store your payment card information. All payment data is securely handled by Stripe in compliance with
                PCI-DSS standards.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Refunds</h3>
              <p className="text-gray-700 mb-4">
                Due to the custom nature of 3D printing services, all sales are final once printing has begun.
                Refunds may be issued at our sole discretion in cases of:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Defective prints that do not meet our quality standards</li>
                <li>Significant delays beyond our estimated timeline (excluding shipping delays beyond our control)</li>
                <li>Our inability to complete your order for technical reasons</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Refund requests must be submitted within 14 days of receiving your order.
              </p>
            </section>

            {/* 5. Order Acceptance */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Order Acceptance</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to refuse or cancel any order for any reason, including but not limited to:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Models that are technically impossible or impractical to print</li>
                <li>Designs that infringe on intellectual property rights of third parties</li>
                <li>Items intended for illegal purposes</li>
                <li>Weapons, weapon components, or items designed to cause harm</li>
                <li>Items that violate our content policy or applicable laws</li>
                <li>Pricing errors or system malfunctions</li>
              </ul>
              <p className="text-gray-700 mb-4">
                If we cancel an order after payment, we will issue a full refund.
              </p>
            </section>

            {/* 6. File Upload and Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. File Upload and Intellectual Property</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Customer Ownership</h3>
              <p className="text-gray-700 mb-4">
                You retain all intellectual property rights in the 3D model files you upload to our Service.
                By uploading files, you grant IDW3D a limited, non-exclusive license to use, reproduce, and process your files
                solely for the purpose of fulfilling your order.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Customer Representations</h3>
              <p className="text-gray-700 mb-4">
                By uploading files and placing an order, you represent and warrant that:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>You own the intellectual property rights to the uploaded designs, or have obtained all necessary permissions</li>
                <li>Your designs do not infringe on any patents, copyrights, trademarks, or other proprietary rights</li>
                <li>You have the right to have the designs manufactured and sold</li>
                <li>The designs comply with all applicable laws and regulations</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Confidentiality</h3>
              <p className="text-gray-700 mb-4">
                We will not share, sell, reproduce, or use your designs for any purpose other than fulfilling your order,
                except as required by law or with your explicit written consent.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.4 File Retention</h3>
              <p className="text-gray-700 mb-4">
                Uploaded files are stored for 30 days after order completion for quality control and potential reorder purposes,
                then automatically deleted unless you request otherwise.
              </p>
            </section>

            {/* 7. Print Quality and Specifications */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Print Quality and Specifications</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Quality Standards</h3>
              <p className="text-gray-700 mb-4">
                We maintain quality control standards for all print quality levels offered. However, 3D printing is a manufacturing process
                with inherent limitations and tolerances:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Draft quality:</strong> ±0.5mm dimensional tolerance, visible layer lines, suitable for prototypes</li>
                <li><strong>Standard quality:</strong> ±0.3mm dimensional tolerance, moderate layer visibility, good for functional parts</li>
                <li><strong>High quality:</strong> ±0.2mm dimensional tolerance, minimal layer visibility, best detail and finish</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Material Properties</h3>
              <p className="text-gray-700 mb-4">
                3D printed materials have different properties than traditionally manufactured materials.
                Prints may exhibit anisotropic strength (weaker between layers), slight warping, color variations, and other characteristics
                inherent to additive manufacturing.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Design Limitations</h3>
              <p className="text-gray-700 mb-4">
                Customer is responsible for ensuring their design is suitable for 3D printing, including adequate wall thickness,
                appropriate support geometry, and printability. We may contact you if we identify issues with your design.
              </p>
            </section>

            {/* 8. Shipping and Delivery */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">8. Shipping and Delivery</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Shipping Methods</h3>
              <p className="text-gray-700 mb-4">
                Shipping costs are included in your quote. We use standard carriers (USPS, UPS, FedEx) based on package size and destination.
                Rush shipping options may be available upon request for an additional fee.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Delivery Timeframes</h3>
              <p className="text-gray-700 mb-4">
                Estimated delivery times are provided at checkout and begin after printing is complete.
                These are estimates only and not guaranteed delivery dates. We are not responsible for carrier delays.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.3 Risk of Loss</h3>
              <p className="text-gray-700 mb-4">
                Risk of loss and title for printed items pass to you upon our delivery to the shipping carrier.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.4 Shipping Address</h3>
              <p className="text-gray-700 mb-4">
                You are responsible for providing an accurate shipping address. We are not responsible for orders shipped to incorrect addresses
                provided by the customer. Address corrections after printing begins may incur additional fees.
              </p>
            </section>

            {/* 9. Defects and Returns */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Defects and Returns</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 Defective Prints</h3>
              <p className="text-gray-700 mb-4">
                If you receive a print with defects that fall outside our quality standards, contact us within 7 days of receipt with:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Your order number</li>
                <li>Clear photographs showing the defect from multiple angles</li>
                <li>Description of the issue</li>
              </ul>
              <p className="text-gray-700 mb-4">
                We will review your claim and, if approved, will reprint the item at no charge or issue a refund at our discretion.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">9.2 Not Considered Defects</h3>
              <p className="text-gray-700 mb-4">
                The following are inherent to 3D printing and not considered defects:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Layer lines appropriate to the selected quality level</li>
                <li>Minor color variations from images shown online</li>
                <li>Small marks from support removal</li>
                <li>Slight dimensional variations within stated tolerances</li>
                <li>Design flaws present in the customer&apos;s file</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">9.3 Return Process</h3>
              <p className="text-gray-700 mb-4">
                Due to the custom nature of orders, we generally do not accept returns unless the print is defective.
                Approved returns must be shipped back within 14 days of approval.
              </p>
            </section>

            {/* 10. Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Limitation of Liability</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Liability Cap</h3>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IDW3D&apos;S TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE SERVICE
                OR ANY PRODUCTS SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SPECIFIC PRODUCT GIVING RISE TO THE CLAIM.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 Excluded Damages</h3>
              <p className="text-gray-700 mb-4">
                IN NO EVENT SHALL IDW3D BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, LOSS OF USE, OR COSTS OF PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
                WHETHER BASED IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 Use of Printed Items</h3>
              <p className="text-gray-700 mb-4">
                We are not liable for any injuries, damages, or losses resulting from your use of printed items.
                Customer is solely responsible for:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Ensuring design suitability for intended use</li>
                <li>Testing and validating functional parts before use in critical applications</li>
                <li>Compliance with applicable safety standards and regulations</li>
                <li>Warning end users of any limitations or hazards</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">10.4 Third-Party Intellectual Property</h3>
              <p className="text-gray-700 mb-4">
                Customer agrees to indemnify and hold harmless IDW3D from any claims of intellectual property infringement
                arising from customer-provided designs.
              </p>
            </section>

            {/* 11. Warranty Disclaimer */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">11. Warranty Disclaimer</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE AND ALL PRODUCTS ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                NON-INFRINGEMENT, OR ACCURACY.
              </p>
              <p className="text-gray-700 mb-4">
                WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS,
                OR THAT DEFECTS WILL BE CORRECTED.
              </p>
            </section>

            {/* 12. Indemnification */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">12. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify, defend, and hold harmless IDW3D, its officers, directors, employees, agents, and affiliates
                from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees)
                arising from:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-2 mb-4">
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Your uploaded designs or files</li>
                <li>Your use of printed products</li>
                <li>Any intellectual property infringement claims related to your designs</li>
              </ul>
            </section>

            {/* 13. Governing Law and Dispute Resolution */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">13. Governing Law and Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.1 Governing Law</h3>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Pennsylvania,
                without regard to its conflict of law provisions.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.2 Jurisdiction</h3>
              <p className="text-gray-700 mb-4">
                Any legal action or proceeding arising under these Terms shall be brought exclusively in the state or federal courts
                located in Pennsylvania, and you hereby consent to personal jurisdiction and venue therein.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">13.3 Informal Resolution</h3>
              <p className="text-gray-700 mb-4">
                Before filing any formal legal action, you agree to first contact us at support@idw3d.com to attempt to resolve the dispute informally.
                We commit to working in good faith to reach a mutually satisfactory resolution.
              </p>
            </section>

            {/* 14. Privacy and Data Collection */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">14. Privacy and Data Collection</h2>
              <p className="text-gray-700 mb-4">
                Our collection and use of personal information is described in our Privacy Policy.
                By using the Service, you consent to our collection and use of personal data as outlined in the Privacy Policy.
              </p>
            </section>

            {/* 15. Changes to Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">15. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the website.
                Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms.
              </p>
              <p className="text-gray-700 mb-4">
                Material changes will be notified via email to registered customers. The &quot;Last Updated&quot; date at the top of this page
                indicates when Terms were last revised.
              </p>
            </section>

            {/* 16. Severability */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">16. Severability</h2>
              <p className="text-gray-700 mb-4">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated
                to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
              </p>
            </section>

            {/* 17. Entire Agreement */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">17. Entire Agreement</h2>
              <p className="text-gray-700 mb-4">
                These Terms, together with our Privacy Policy and any additional terms to which you agree when using particular elements of the Service,
                constitute the entire agreement between you and IDW3D concerning the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            {/* 18. Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">18. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms or our services, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-gray-700">
                <p className="font-semibold">Intelligent Design Works Limited</p>
                <p>Email: support@idw3d.com</p>
                <p>Business Type: Pennsylvania Limited Liability Company</p>
              </div>
            </section>
          </div>

          {/* Footer Notice */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              By using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
