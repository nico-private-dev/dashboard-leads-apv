import type { Metadata } from "next";
import { CarteAuth } from "@/components/carte-auth";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <CarteAuth titre="Connexion au dashboard leads">
      <FormulaireConnexion />
    </CarteAuth>
  );
}
