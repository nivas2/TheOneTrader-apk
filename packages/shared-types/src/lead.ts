export interface ILead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

export interface ILeadCreate {
  name: string;
  email: string;
  phone: string;
}
