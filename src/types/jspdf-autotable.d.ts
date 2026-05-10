import "jspdf";

declare module "jspdf" {
  interface jsPDF {
    // Added by `jspdf-autotable`
    // We keep it loose because plugin typings vary by version.
    lastAutoTable?: any;
  }
}

