import java.sql.*;

public class CheckDb {
    public static void main(String[] args) {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/share-money", "postgres", "admin")) {
            Statement stmt = conn.createStatement();
            
            System.out.println("--- TRANSACTION CATEGORIES ---");
            try (ResultSet rs = stmt.executeQuery("SELECT c.id, c.name, c.type FROM categories c")) {
                while (rs.next()) {
                    System.out.println("Category: ID=" + rs.getString("id") + ", Name=[" + rs.getString("name") + "], Type=" + rs.getString("type"));
                }
            }

            System.out.println("--- USERS ---");
            try (ResultSet rs = stmt.executeQuery("SELECT email, password_hash FROM users")) {
                while (rs.next()) {
                    System.out.println("User: Email=" + rs.getString("email") 
                        + ", Hash=[" + rs.getString("password_hash") + "]");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

