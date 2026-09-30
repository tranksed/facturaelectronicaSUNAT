const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');

/**
 * Decrypts a PFX/P12 certificate and extracts the private key and public certificate in PEM format.
 * @param {Buffer} pfxBuffer - The certificate file buffer
 * @param {string} password - The password for the certificate
 */
function extractKeysFromPfx(pfxBuffer, password) {
  try {
    const pfxDer = pfxBuffer.toString('binary');
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

    let privateKeyPem = null;
    let certPem = null;

    // Search for private key in shrouded bags
    const shroudedKeyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (shroudedKeyBags && shroudedKeyBags.length > 0) {
      privateKeyPem = forge.pki.privateKeyToPem(shroudedKeyBags[0].key);
    } else {
      // Search in plain key bags
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
      if (keyBags && keyBags.length > 0) {
        privateKeyPem = forge.pki.privateKeyToPem(keyBags[0].key);
      }
    }

    // Search for certificate
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
    if (certBags && certBags.length > 0) {
      certPem = forge.pki.certificateToPem(certBags[0].cert);
    }

    if (!privateKeyPem || !certPem) {
      throw new Error('No se pudo extraer la clave privada o el certificado del archivo PFX.');
    }

    return { privateKeyPem, certPem };
  } catch (error) {
    throw new Error('Error al descifrar el certificado PFX: ' + error.message);
  }
}

/**
 * Signs a UBL 2.1 XML document with an X.509 certificate.
 * @param {string} xmlContent - The raw XML content
 * @param {string} privateKeyPem - The private key in PEM format
 * @param {string} certPem - The public certificate in PEM format
 */
function signXml(xmlContent, privateKeyPem, certPem) {
  try {
    const sig = new SignedXml();
    sig.signingKey = privateKeyPem;
    
    // Set standard algorithms for SUNAT
    sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";

    // Clean cert PEM to get raw base64 string
    const cleanCertPem = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/[\r\n]/g, "");

    // Setup reference to sign the entire document (URI="" for standard UBL 2.1)
    // Parameter 7 (isEmptyUri: true) prevents xml-crypto from injecting Id="_0" into the root element,
    // which fixes SUNAT Error 0306: element Invoice had undefined attribute Id.
    sig.addReference(
      "/*",
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ],
      "http://www.w3.org/2001/04/xmlenc#sha256",
      "",
      "",
      "",
      true
    );

    // Setup KeyInfo provider to inject X509Data
    sig.keyInfoProvider = {
      getKeyInfo: function(key, prefix) {
        const p = prefix ? prefix + ':' : '';
        return `<${p}X509Data><${p}X509Certificate>${cleanCertPem}</${p}X509Certificate></${p}X509Data>`;
      }
    };

    // Compute signature and insert it inside ExtensionContent with standard ds prefix and SignatureSP Id
    sig.computeSignature(xmlContent, {
      prefix: 'ds',
      attrs: {
        Id: 'SignatureSP'
      },
      existingPrefixes: {
        ds: 'http://www.w3.org/2000/09/xmldsig#'
      },
      location: {
        reference: "//*[local-name()='ExtensionContent']",
        action: "append"
      }
    });

    const signedXml = sig.getSignedXml();

    // Extract DigestValue (hash) for PDF and printing
    const digestMatch = signedXml.match(/<(?:ds:)?DigestValue>(.*?)<\/(?:ds:)?DigestValue>/);
    const digestValue = digestMatch ? digestMatch[1] : '';

    return { signedXml, digestValue };
  } catch (error) {
    throw new Error('Error al firmar el XML: ' + error.message);
  }
}

module.exports = {
  extractKeysFromPfx,
  signXml
};
