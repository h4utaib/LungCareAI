export const base44 = {
    entities: {
      DiagnosisRecord: {
        list: async () => [],
        create: async (data) => console.log("Saved:", data),
      },
    },
    integrations: {
      Core: {
        UploadFile: async ({ file }) => {
          const fakeUrl = URL.createObjectURL(file);
          return { file_url: fakeUrl };
        },
        InvokeLLM: async ({ prompt }) => {
          console.log("Mock LLM prompt:", prompt);
          return "Generated mock report content.";
        },
        SendEmail: async ({ to, subject }) => {
          console.log(`Mock email sent to ${to}: ${subject}`);
        },
      },
    },
    auth: {
      me: async () => ({ email: "doctor@example.com" }),
    },
  };
  