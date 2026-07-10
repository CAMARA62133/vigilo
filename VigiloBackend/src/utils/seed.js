import { User } from "../models/index.js";

const createDefaultAdmin = async () => {
  try {
    const adminEmail = "vigiloadmin@gmail.com";

    const adminExists = await User.findOne({
      where: {
        email: adminEmail,
      },
    });

    if (!adminExists) {
      const newAdmin = await User.create({
        email: adminEmail,
        password: "Admin123!",
        fullname: "Super Admin",
        phone: "0000000000",
        role: "super_admin",
        status: "active",
        mustChangePassword: false,
      });

      console.log(`👤 Super Admin créé : ${newAdmin.email}`);
    } else {
      let needsSave = false;

      if (adminExists.status !== "active") {
        adminExists.status = "active";
        needsSave = true;
      }

      if (adminExists.role !== "super_admin") {
        adminExists.role = "super_admin";
        needsSave = true;
      }

      if (needsSave) {
        await adminExists.save();

        console.log(`🔄 Super Admin mis à jour : ${adminExists.email}`);
      } else {
        console.log(`✅ Super Admin déjà existant : ${adminExists.email}`);
      }
    }
  } catch (error) {
    console.error("❌ Erreur création Super Admin :", error.message);
  }
};

export default createDefaultAdmin;
