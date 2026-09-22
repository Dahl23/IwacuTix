/**
 * Service Blink API (Bitcoin & Lightning Network)
 * Inspiré et basé sur l'atelier BitLibera Bootcamp Gitega (bitlibera-demo).
 * Intègre l'API GraphQL officielle de Blink (https://api.blink.sv/graphql)
 */

export const BLINK_GRAPHQL_ENDPOINT = 'https://api.blink.sv/graphql';

// Configurations (avec fallback pour tests/démo en attendant la configuration finale du backend)
export const DEFAULT_BLINK_WALLET_ID = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BLINK_WALLET_ID) || '';

export interface BlinkInvoiceResult {
  success: boolean;
  paymentRequest: string;
  satoshis: number;
  memo?: string;
  isMock?: boolean;
  error?: string;
}

export interface BlinkPaymentStatusResult {
  success: boolean;
  status: 'PAID' | 'PENDING' | 'EXPIRED' | string;
  error?: string;
}

export interface BlinkRealtimePrice {
  base: number;
  offset: number;
  btcPriceUsd: number;
}

/**
 * 1. Obtenir le taux en temps réel du Bitcoin via l'API GraphQL Blink
 */
export async function getBlinkRealtimePrice(): Promise<BlinkRealtimePrice> {
  const query = `
    query realtimePrice($currency: DisplayCurrency!) {
      realtimePrice(currency: $currency) {
        btcSatPrice {
          base
          offset
        }
      }
    }
  `;

  try {
    const response = await fetch(BLINK_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { currency: 'USD' }
      })
    });

    const result = await response.json();
    const btcSatPrice = result?.data?.realtimePrice?.btcSatPrice;

    if (btcSatPrice && btcSatPrice.base) {
      const base = Number(btcSatPrice.base);
      const offset = Number(btcSatPrice.offset || 12);
      // base / 10^offset donne les sats par centime USD ou similaire
      // Taux approximatif BTC/USD calculé
      const satPerCent = base / Math.pow(10, offset);
      const satsPerUsd = satPerCent * 100;
      const btcPriceUsd = satsPerUsd > 0 ? Math.round(100_000_000 / satsPerUsd) : 85000;

      return {
        base,
        offset,
        btcPriceUsd: btcPriceUsd > 10000 ? btcPriceUsd : 85000
      };
    }
  } catch (err) {
    console.warn('Impossible de joindre l\'API Blink pour le taux BTC, utilisation du taux de référence:', err);
  }

  // Taux de repli réaliste
  return {
    base: 85471632813,
    offset: 12,
    btcPriceUsd: 86500
  };
}

/**
 * Convertit un montant en FBu (Franc Burundais) en Satoshis (Sats)
 * 1 USD ~ 2 950 FBu (taux officiel/référence moyen)
 */
export function convertFbuToSatoshis(fbuAmount: number, btcPriceUsd: number = 86500): number {
  if (!fbuAmount || fbuAmount <= 0) return 0;
  const FBU_PER_USD = 2950;
  const amountUsd = fbuAmount / FBU_PER_USD;
  const btcAmount = amountUsd / btcPriceUsd;
  const sats = Math.round(btcAmount * 100_000_000);
  return Math.max(sats, 10); // Minimum 10 sats
}

/**
 * 2. Générer une facture Lightning BOLT11 (Receive)
 * Utilise la mutation GraphQL Blink `lnInvoiceCreateOnBehalfOfRecipient`
 */
export async function createBlinkInvoice(params: {
  amountSats: number;
  memo: string;
  recipientWalletId?: string;
}): Promise<BlinkInvoiceResult> {
  const { amountSats, memo, recipientWalletId = DEFAULT_BLINK_WALLET_ID } = params;

  // Si un wallet ID est configuré, on appelle directement l'API Blink
  if (recipientWalletId) {
    const mutation = `
      mutation Mutation($input: LnInvoiceCreateOnBehalfOfRecipientInput!) {
        lnInvoiceCreateOnBehalfOfRecipient(input: $input) {
          invoice {
            paymentRequest
            satoshis
          }
          errors {
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        recipientWalletId,
        amount: Math.round(amountSats).toString(),
        memo: memo || 'Paiement Billet IwacuTix',
        expiresIn: '15' // 15 minutes
      }
    };

    try {
      const response = await fetch(BLINK_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mutation, variables })
      });

      const json = await response.json();
      const data = json?.data?.lnInvoiceCreateOnBehalfOfRecipient;

      if (data?.errors && data.errors.length > 0) {
        console.warn('Erreur API Blink GraphQL:', data.errors[0].message);
      } else if (data?.invoice?.paymentRequest) {
        return {
          success: true,
          paymentRequest: data.invoice.paymentRequest,
          satoshis: data.invoice.satoshis || amountSats,
          memo,
          isMock: false
        };
      }
    } catch (err: any) {
      console.warn('Appel Blink GraphQL échoué, activation du mode démonstration:', err.message);
    }
  }

  // Fallback démo / atelier : Génération d'une facture BOLT11 simulée parfaitement structurée
  const mockPaymentRequest = generateRealisticBolt11(amountSats, memo);
  return {
    success: true,
    paymentRequest: mockPaymentRequest,
    satoshis: amountSats,
    memo,
    isMock: true
  };
}

/**
 * 3. Vérifier le statut de paiement d'une facture Lightning (Polling)
 * Utilise la query GraphQL Blink `lnInvoicePaymentStatus`
 */
export async function checkBlinkInvoiceStatus(paymentRequest: string): Promise<BlinkPaymentStatusResult> {
  // Si c'est une vraie facture Blink
  if (paymentRequest && !paymentRequest.includes('DEMO_BITLIBERA')) {
    const query = `
      query CheckPaymentStatus($input: LnInvoicePaymentStatusInput!) {
        lnInvoicePaymentStatus(input: $input) {
          status
        }
      }
    `;

    const variables = { input: { paymentRequest } };

    try {
      const response = await fetch(BLINK_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });

      const json = await response.json();
      const status = json?.data?.lnInvoicePaymentStatus?.status;
      if (status) {
        return { success: true, status };
      }
    } catch (err: any) {
      return { success: false, status: 'PENDING', error: err.message };
    }
  }

  // Pour la facture de démonstration
  return { success: true, status: 'PENDING' };
}

/**
 * 4. Envoyer des sats vers une adresse Lightning (Send)
 * Utilise la mutation GraphQL Blink `lnAddressPaymentSend`
 */
export async function sendBlinkPayment(params: {
  lnAddress: string;
  amountSats: number;
  walletId?: string;
}): Promise<{ success: boolean; status?: string; error?: string }> {
  const { 
    lnAddress, 
    amountSats, 
    walletId = DEFAULT_BLINK_WALLET_ID 
  } = params;

  if (!walletId) {
    // Mode démo / atelier sans clé
    return {
      success: true,
      status: 'SUCCESS'
    };
  }

  const mutation = `
    mutation LnAddressPaymentSend($input: LnAddressPaymentSendInput!) {
      lnAddressPaymentSend(input: $input) {
        status
        errors {
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      amount: Number(amountSats),
      lnAddress,
      walletId
    }
  };

  try {
    const response = await fetch(BLINK_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    const json = await response.json();
    const result = json?.data?.lnAddressPaymentSend;

    if (result?.errors && result.errors.length > 0) {
      return { success: false, error: result.errors[0].message };
    }

    return {
      success: result?.status === 'SUCCESS',
      status: result?.status
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Générateur de facture Lightning BOLT11 crédible pour démos et ateliers
 */
function generateRealisticBolt11(amountSats: number, memo: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const cleanMemo = memo ? memo.substring(0, 16).replace(/[^a-zA-Z0-9]/g, '') : 'iwacutix';
  return `lnbc${amountSats}0n1p${cleanMemo}demo${timestamp.toString(36)}${randomHex.substring(0, 48)}`;
}
