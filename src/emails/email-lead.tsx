import { Body, Button, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";

// Email partenaire (brief §7) : nouveau lead, relance 48 h ou suivi commission.
export type EmailLeadProps = {
  intro: string;
  thematique: string;
  lead: {
    nom: string;
    telephone: string | null;
    email: string | null;
    lieu: string;
    besoin: string | null;
    champs: { label: string; valeur: string }[];
    resumeAppel?: string | null;
  };
  boutons: { libelle: string; url: string; principal?: boolean }[];
};

const rouge = "#C0504C";
const texte = { color: "#1F1F1F", fontSize: "14px", lineHeight: "22px", margin: "0 0 8px" };
const discret = { ...texte, color: "#6B6B6B", fontSize: "12px" };

export function EmailLead({ intro, thematique, lead, boutons }: EmailLeadProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{`${thematique} — ${lead.lieu}`}</Preview>
      <Body style={{ backgroundColor: "#FAF8F5", fontFamily: "Montserrat, Arial, sans-serif", padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E8E4DE", padding: "24px", maxWidth: "560px" }}>
          <Text style={{ ...texte, fontSize: "18px", fontWeight: 700 }}>{thematique}</Text>
          <Text style={texte}>{intro}</Text>
          <Hr style={{ borderColor: "#E8E4DE" }} />
          <Text style={{ ...texte, fontWeight: 600 }}>{lead.nom}</Text>
          {lead.telephone && <Text style={texte}>Téléphone : {lead.telephone}</Text>}
          {lead.email && <Text style={texte}>Email : {lead.email}</Text>}
          <Text style={texte}>Localisation : {lead.lieu}</Text>
          {lead.besoin && <Text style={texte}>Besoin : {lead.besoin}</Text>}
          {lead.champs.map((c, i) => (
            <Text key={i} style={texte}>
              {c.label} : {c.valeur}
            </Text>
          ))}
          {lead.resumeAppel && <Text style={texte}>Résumé de l&apos;appel : {lead.resumeAppel}</Text>}
          <Hr style={{ borderColor: "#E8E4DE" }} />
          <Section>
            {boutons.map((b) => (
              <Button
                key={b.libelle}
                href={b.url}
                style={{
                  display: "inline-block",
                  margin: "0 8px 8px 0",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                  backgroundColor: b.principal ? rouge : "#FFFFFF",
                  color: b.principal ? "#FFFFFF" : "#1F1F1F",
                  border: `1px solid ${b.principal ? rouge : "#E8E4DE"}`,
                }}
              >
                {b.libelle}
              </Button>
            ))}
          </Section>
          <Text style={discret}>Un clic suffit, sans connexion. Ces liens sont valables 60 jours.</Text>
          <Text style={discret}>Agence APV</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailAdmin({ titre, lignes, lien }: { titre: string; lignes: string[]; lien: string }) {
  return (
    <Html lang="fr">
      <Head />
      <Body style={{ backgroundColor: "#FAF8F5", fontFamily: "Montserrat, Arial, sans-serif", padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E8E4DE", padding: "24px", maxWidth: "560px" }}>
          <Text style={{ ...texte, fontSize: "16px", fontWeight: 700 }}>{titre}</Text>
          {lignes.map((l, i) => (
            <Text key={i} style={texte}>
              {l}
            </Text>
          ))}
          <Button href={lien} style={{ padding: "10px 16px", borderRadius: "10px", backgroundColor: rouge, color: "#FFFFFF", fontWeight: 600, fontSize: "14px" }}>
            Ouvrir le dashboard
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
