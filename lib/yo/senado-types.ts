export type SenadoGraphMember = {
  id: string;
  name: string;
  vinculo: string;
};

export type SenadoGraphSnapshot = {
  operator: { id: string; name: string } | null;
  members: SenadoGraphMember[];
};
