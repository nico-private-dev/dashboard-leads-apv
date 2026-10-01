export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alertes: {
        Row: {
          created_at: string
          details: Json
          id: string
          lead_id: string | null
          message: string
          resolue: boolean
          resolue_le: string | null
          site_id: string | null
          source_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          lead_id?: string | null
          message: string
          resolue?: boolean
          resolue_le?: string | null
          site_id?: string | null
          source_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          lead_id?: string | null
          message?: string
          resolue?: boolean
          resolue_le?: string | null
          site_id?: string | null
          source_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      attributions: {
        Row: {
          actif: boolean
          created_at: string
          envoi_auto: boolean
          id: string
          partenaire_id: string
          priorite: number
          site_id: string | null
          thematique_id: string
          type_zone: string
          zone_config: Json
        }
        Insert: {
          actif?: boolean
          created_at?: string
          envoi_auto?: boolean
          id?: string
          partenaire_id: string
          priorite?: number
          site_id?: string | null
          thematique_id: string
          type_zone: string
          zone_config?: Json
        }
        Update: {
          actif?: boolean
          created_at?: string
          envoi_auto?: boolean
          id?: string
          partenaire_id?: string
          priorite?: number
          site_id?: string | null
          thematique_id?: string
          type_zone?: string
          zone_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "attributions_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributions_thematique_id_fkey"
            columns: ["thematique_id"]
            isOneToOne: false
            referencedRelation: "thematiques"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          facture_le: string
          id: string
          mois: string
          montant: number
          nb_leads: number
          partenaire_id: string
          paye_le: string | null
          statut: string
        }
        Insert: {
          facture_le?: string
          id?: string
          mois: string
          montant: number
          nb_leads?: number
          partenaire_id: string
          paye_le?: string | null
          statut: string
        }
        Update: {
          facture_le?: string
          id?: string
          mois?: string
          montant?: number
          nb_leads?: number
          partenaire_id?: string
          paye_le?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          auteur: string
          auteur_id: string | null
          created_at: string
          details: Json
          id: string
          lead_id: string
          type: string
        }
        Insert: {
          auteur: string
          auteur_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          lead_id: string
          type: string
        }
        Update: {
          auteur?: string
          auteur_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          lead_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          allo_enregistrement_url: string | null
          allo_resume: string | null
          allo_transcription: string | null
          attribue_le: string | null
          besoin: string | null
          champs_specifiques: Json
          code_postal: string | null
          created_at: string
          departement: string | null
          doublon_de: string | null
          doublon_verifie: boolean
          email: string | null
          envoye_le: string | null
          facturable_le: string | null
          geoloc_incertaine: boolean
          id: string
          lat: number | null
          lng: number | null
          montant_commission: number | null
          montant_devis: number | null
          motif_contestation: string | null
          nom: string | null
          notes_internes: string | null
          partenaire_id: string | null
          payload_brut: Json | null
          pays: string | null
          prenom: string | null
          prix_facture: number | null
          recu_le: string
          region: string | null
          site_id: string | null
          source_id: string | null
          statut: string
          statut_facturation: string
          telephone: string | null
          thematique_id: string
          updated_at: string
          ville: string | null
          vu_le: string | null
        }
        Insert: {
          allo_enregistrement_url?: string | null
          allo_resume?: string | null
          allo_transcription?: string | null
          attribue_le?: string | null
          besoin?: string | null
          champs_specifiques?: Json
          code_postal?: string | null
          created_at?: string
          departement?: string | null
          doublon_de?: string | null
          doublon_verifie?: boolean
          email?: string | null
          envoye_le?: string | null
          facturable_le?: string | null
          geoloc_incertaine?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          montant_commission?: number | null
          montant_devis?: number | null
          motif_contestation?: string | null
          nom?: string | null
          notes_internes?: string | null
          partenaire_id?: string | null
          payload_brut?: Json | null
          pays?: string | null
          prenom?: string | null
          prix_facture?: number | null
          recu_le?: string
          region?: string | null
          site_id?: string | null
          source_id?: string | null
          statut?: string
          statut_facturation?: string
          telephone?: string | null
          thematique_id: string
          updated_at?: string
          ville?: string | null
          vu_le?: string | null
        }
        Update: {
          allo_enregistrement_url?: string | null
          allo_resume?: string | null
          allo_transcription?: string | null
          attribue_le?: string | null
          besoin?: string | null
          champs_specifiques?: Json
          code_postal?: string | null
          created_at?: string
          departement?: string | null
          doublon_de?: string | null
          doublon_verifie?: boolean
          email?: string | null
          envoye_le?: string | null
          facturable_le?: string | null
          geoloc_incertaine?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          montant_commission?: number | null
          montant_devis?: number | null
          motif_contestation?: string | null
          nom?: string | null
          notes_internes?: string | null
          partenaire_id?: string | null
          payload_brut?: Json | null
          pays?: string | null
          prenom?: string | null
          prix_facture?: number | null
          recu_le?: string
          region?: string | null
          site_id?: string | null
          source_id?: string | null
          statut?: string
          statut_facturation?: string
          telephone?: string | null
          thematique_id?: string
          updated_at?: string
          ville?: string | null
          vu_le?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_doublon_de_fkey"
            columns: ["doublon_de"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_thematique_id_fkey"
            columns: ["thematique_id"]
            isOneToOne: false
            referencedRelation: "thematiques"
            referencedColumns: ["id"]
          },
        ]
      }
      partenaires: {
        Row: {
          actif: boolean
          adresse: string | null
          contact_email: string | null
          contact_nom: string | null
          created_at: string
          date_debut: string | null
          delai_contestation_jours: number
          emails_copie: string[]
          id: string
          modele: string | null
          montant_abonnement_mensuel: number | null
          notes: string | null
          prix_lead: number | null
          raison_sociale: string
          siret: string | null
          site_web: string | null
          taux_commission: number | null
          telephone: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          contact_email?: string | null
          contact_nom?: string | null
          created_at?: string
          date_debut?: string | null
          delai_contestation_jours?: number
          emails_copie?: string[]
          id?: string
          modele?: string | null
          montant_abonnement_mensuel?: number | null
          notes?: string | null
          prix_lead?: number | null
          raison_sociale: string
          siret?: string | null
          site_web?: string | null
          taux_commission?: number | null
          telephone?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          contact_email?: string | null
          contact_nom?: string | null
          created_at?: string
          date_debut?: string | null
          delai_contestation_jours?: number
          emails_copie?: string[]
          id?: string
          modele?: string | null
          montant_abonnement_mensuel?: number | null
          notes?: string | null
          prix_lead?: number | null
          raison_sociale?: string
          siret?: string | null
          site_web?: string | null
          taux_commission?: number | null
          telephone?: string | null
        }
        Relationships: []
      }
      profils: {
        Row: {
          created_at: string
          email: string
          id: string
          nom: string | null
          partenaire_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nom?: string | null
          partenaire_id?: string | null
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nom?: string | null
          partenaire_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profils_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          actif: boolean
          alerte_silence_jours: number | null
          collecte: string
          created_at: string
          domaine: string | null
          id: string
          nom: string
          pays: string
          region: string | null
          thematique_id: string
        }
        Insert: {
          actif?: boolean
          alerte_silence_jours?: number | null
          collecte?: string
          created_at?: string
          domaine?: string | null
          id?: string
          nom: string
          pays?: string
          region?: string | null
          thematique_id: string
        }
        Update: {
          actif?: boolean
          alerte_silence_jours?: number | null
          collecte?: string
          created_at?: string
          domaine?: string | null
          id?: string
          nom?: string
          pays?: string
          region?: string | null
          thematique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_thematique_id_fkey"
            columns: ["thematique_id"]
            isOneToOne: false
            referencedRelation: "thematiques"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          actif: boolean
          config: Json
          created_at: string
          dernier_lead_le: string | null
          id: string
          nom: string
          site_id: string | null
          thematique_id: string
          type: string
          webhook_secret: string | null
          webhook_token: string
        }
        Insert: {
          actif?: boolean
          config?: Json
          created_at?: string
          dernier_lead_le?: string | null
          id?: string
          nom: string
          site_id?: string | null
          thematique_id: string
          type: string
          webhook_secret?: string | null
          webhook_token?: string
        }
        Update: {
          actif?: boolean
          config?: Json
          created_at?: string
          dernier_lead_le?: string | null
          id?: string
          nom?: string
          site_id?: string | null
          thematique_id?: string
          type?: string
          webhook_secret?: string | null
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_thematique_id_fkey"
            columns: ["thematique_id"]
            isOneToOne: false
            referencedRelation: "thematiques"
            referencedColumns: ["id"]
          },
        ]
      }
      stats_externes: {
        Row: {
          ca_verse: number | null
          created_at: string
          id: string
          nb_leads: number
          nb_leads_valides: number | null
          notes: string | null
          periode_debut: string
          periode_fin: string
          plateforme: string
          saisi_par: string | null
          site_id: string
        }
        Insert: {
          ca_verse?: number | null
          created_at?: string
          id?: string
          nb_leads?: number
          nb_leads_valides?: number | null
          notes?: string | null
          periode_debut: string
          periode_fin: string
          plateforme?: string
          saisi_par?: string | null
          site_id: string
        }
        Update: {
          ca_verse?: number | null
          created_at?: string
          id?: string
          nb_leads?: number
          nb_leads_valides?: number | null
          notes?: string | null
          periode_debut?: string
          periode_fin?: string
          plateforme?: string
          saisi_par?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stats_externes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      thematiques: {
        Row: {
          actif: boolean
          couleur: string
          created_at: string
          id: string
          multi_sites: boolean
          nom: string
          slug: string
        }
        Insert: {
          actif?: boolean
          couleur?: string
          created_at?: string
          id?: string
          multi_sites?: boolean
          nom: string
          slug: string
        }
        Update: {
          actif?: boolean
          couleur?: string
          created_at?: string
          id?: string
          multi_sites?: boolean
          nom?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      espace_leads: {
        Args: never
        Returns: {
          besoin: string
          champs_specifiques: Json
          code_postal: string
          departement: string
          email: string
          envoye_le: string
          id: string
          montant_devis: number
          motif_contestation: string
          nom: string
          prenom: string
          recu_le: string
          statut: string
          telephone: string
          thematique: string
          ville: string
          vu_le: string
        }[]
      }
      espace_partenaire: {
        Args: never
        Returns: {
          raison_sociale: string
        }[]
      }
      est_admin: { Args: never; Returns: boolean }
      partenaire_courant: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
