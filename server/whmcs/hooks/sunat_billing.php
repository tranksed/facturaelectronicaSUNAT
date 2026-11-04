<?php
/**
 * WHMCS Hook: Emisión Automática de Facturación Electrónica SUNAT
 * Compatible con: APISUNAT PRO (SaaS)
 * 
 * Instalación:
 * 1. Copia este archivo en tu servidor WHMCS en: /includes/hooks/sunat_billing.php
 * 2. Configura las constantes SUNAT_API_URL y SUNAT_API_KEY más abajo.
 * 3. Cada vez que una factura sea pagada en WHMCS (InvoicePaid), se emitirá
 *    automáticamente la Boleta o Factura electrónica en SUNAT y se registrará
 *    el número de comprobante y link en las notas de la factura WHMCS.
 */

if (!defined("WHMCS")) {
    die("Acceso denegado");
}

use WHMCS\Database\Capsule;

// CONFIGURACIÓN: Reemplaza con los datos de tu plataforma APISUNAT
define('SUNAT_API_URL', 'http://tu-servidor-apisunat.com'); // Sin barra final
define('SUNAT_API_KEY', 'sk_live_TU_API_KEY_AQUI');       // Tu API Key generada en el panel
define('SUNAT_SERIE_FACTURA', 'F001');                     // Serie para Facturas con RUC
define('SUNAT_SERIE_BOLETA', 'B001');                      // Serie para Boletas con DNI

add_hook('InvoicePaid', 1, function($vars) {
    $invoiceId = $vars['invoiceid'];

    try {
        // 1. Obtener detalles de la factura WHMCS
        $invoice = Capsule::table('tblinvoices')->where('id', $invoiceId)->first();
        if (!$invoice) return;

        // Evitar doble emisión si ya tiene comprobante registrado
        if (!empty($invoice->notes) && strpos($invoice->notes, '[SUNAT:') !== false) {
            logActivity("WHMCS-SUNAT: Factura #{$invoiceId} ya fue emitida previamente.");
            return;
        }

        // 2. Obtener datos del cliente
        $client = Capsule::table('tblclients')->where('id', $invoice->userid)->first();
        if (!$client) return;

        // Determinar RUC o DNI
        // Busca en tax_id o en campos personalizados (Custom Fields)
        $docNumero = trim($client->tax_id ?? '');
        $razonSocial = trim($client->companyname ?? '');

        // Si no tiene tax_id, buscar en campos personalizados del cliente
        if (empty($docNumero)) {
            $customField = Capsule::table('tblcustomfieldsvalues')
                ->join('tblcustomfields', 'tblcustomfields.id', '=', 'tblcustomfieldsvalues.fieldid')
                ->where('tblcustomfields.relid', 0)
                ->where('tblcustomfieldsvalues.relid', $client->id)
                ->whereIn('tblcustomfields.fieldname', ['RUC', 'DNI', 'Documento', 'RUC o DNI', 'Nro Documento'])
                ->select('tblcustomfieldsvalues.value')
                ->first();

            if ($customField && !empty($customField->value)) {
                $docNumero = trim($customField->value);
            }
        }

        // Si el cliente no tiene RUC ni DNI registrado, no se puede emitir
        if (empty($docNumero)) {
            logActivity("WHMCS-SUNAT Error: Cliente #{$client->id} no tiene RUC ni DNI para la factura #{$invoiceId}.");
            return;
        }

        // Tipo de documento: Factura (01) si RUC (11 dígitos) o Boleta (03) si DNI (8 dígitos)
        $isRuc = (strlen($docNumero) === 11);
        $tipoDoc = $isRuc ? '01' : '03';
        $tipoDocIdentidad = $isRuc ? '6' : '1';
        $serie = $isRuc ? SUNAT_SERIE_FACTURA : SUNAT_SERIE_BOLETA;

        if (empty($razonSocial)) {
            $razonSocial = trim($client->firstname . ' ' . $client->lastname);
        }

        $direccion = trim(($client->address1 ?? '') . ' ' . ($client->city ?? '') . ' ' . ($client->state ?? ''));

        // 3. Obtener ítems de la factura
        $invoiceItems = Capsule::table('tblinvoiceitems')->where('invoiceid', $invoiceId)->get();
        $itemsPayload = [];

        foreach ($invoiceItems as $item) {
            $amount = floatval($item->amount);
            if ($amount <= 0) continue; // Saltar ítems en cero o descuentos

            $itemsPayload[] = [
                'descripcion' => $item->description,
                'cantidad' => 1,
                'precioUnitario' => $amount
            ];
        }

        if (empty($itemsPayload)) {
            // Si el monto total fue con descuento o ítems en cero
            $itemsPayload[] = [
                'descripcion' => 'Servicios de Hosting / Dominios Web - Factura #' . $invoiceId,
                'cantidad' => 1,
                'precioUnitario' => floatval($invoice->total)
            ];
        }

        // 4. Armar el payload para APISUNAT PRO
        $payload = [
            'tipoDoc' => $tipoDoc,
            'serie' => $serie,
            'cliente' => [
                'tipoDoc' => $tipoDocIdentidad,
                'numDoc' => $docNumero,
                'rznSocial' => $razonSocial,
                'direccion' => $direccion,
                'email' => $client->email
            ],
            'moneda' => ($invoice->currency == 2 || strtoupper($client->currency) == 'USD') ? 'USD' : 'PEN',
            'formaPago' => 'Contado',
            'observaciones' => "Pago orden WHMCS #{$invoiceId} - Transacción: " . ($invoice->paymentmethod ?? 'Online'),
            'items' => $itemsPayload
        ];

        // 5. Enviar petición HTTP POST a APISUNAT
        $ch = curl_init(SUNAT_API_URL . '/api/v1/external/invoices');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . SUNAT_API_KEY
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            logActivity("WHMCS-SUNAT cURL Error en factura #{$invoiceId}: " . $curlError);
            return;
        }

        $resData = json_decode($response, true);

        if ($httpCode === 200 && !empty($resData['id'])) {
            $sunatId = $resData['id'];
            $pdfUrl = SUNAT_API_URL . ($resData['links']['pdfA4Url'] ?? '');
            
            $notaSunat = "\n[SUNAT: {$sunatId} - Estado: {$resData['status']} - PDF: {$pdfUrl}]";
            Capsule::table('tblinvoices')->where('id', $invoiceId)->update([
                'notes' => ($invoice->notes ?? '') . $notaSunat
            ]);

            logActivity("WHMCS-SUNAT: Comprobante {$sunatId} emitido exitosamente para factura WHMCS #{$invoiceId}.");
        } else {
            $msg = $resData['error'] ?? 'Error desconocido';
            logActivity("WHMCS-SUNAT Error al emitir factura #{$invoiceId}: HTTP {$httpCode} - {$msg}");
        }

    } catch (\Exception $e) {
        logActivity("WHMCS-SUNAT Excepción en factura #{$invoiceId}: " . $e->getMessage());
    }
});
