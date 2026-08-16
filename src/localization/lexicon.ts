export type Concept =
  | 'reject'
  | 'necessaryOnly'
  | 'manage'
  | 'disableAll'
  | 'object'
  | 'save'
  | 'vendor'
  | 'consentContext'
  | 'unsafePositive';

// Phrases are deliberately separate from behavior. Longer phrases win during classification.
export const LEXICON: Readonly<Record<Concept, readonly string[]>> = {
  reject: ['reject all', 'decline all', 'deny all', 'refuse all', 'tout refuser', 'alle ablehnen', 'alles afwijzen', 'rechazar todo', 'rifiuta tutto', 'rejeitar tudo', 'afvis alle'],
  necessaryOnly: ['necessary only', 'essential only', 'continue without accepting', 'nur notwendige', 'uniquement nécessaires', 'solo necesarias', 'solo necessari', 'alleen noodzakelijk'],
  manage: ['manage preferences', 'privacy settings', 'cookie settings', 'customise', 'customize', 'paramètres', 'einstellungen', 'preferencias', 'impostazioni', 'instellingen'],
  disableAll: ['disable all', 'turn off all', 'deselect all', 'tout désactiver', 'alle deaktivieren', 'desactivar todo', 'disattiva tutto'],
  object: ['object all', 'object to all', 'oppose all', 'tout refuser', 'widersprechen', 'opponerme', 'bezwaar maken'],
  save: ['save choices', 'save preferences', 'confirm choices', 'apply settings', 'enregistrer', 'speichern', 'guardar preferencias', 'salva preferenze', 'keuzes opslaan'],
  vendor: ['vendor', 'vendors', 'partner', 'partners', 'fournisseur', 'anbieter', 'proveedor', 'fornitore', 'leverancier'],
  consentContext: ['cookie', 'cookies', 'privacy', 'consent', 'tracking', 'personal data', 'données personnelles', 'datenschutz', 'privacidad', 'riservatezza', 'persoonlijke gegevens'],
  unsafePositive: ['accept all', 'agree and continue', 'agree', 'allow all', 'recommended', 'enable all', 'consent all', 'tout accepter', 'alle akzeptieren', 'aceptar todo', 'accetta tutto', 'alles accepteren'],
};
