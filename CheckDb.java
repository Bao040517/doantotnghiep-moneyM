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

            System.out.println("--- RECENT TRANSACTIONS ---");
            try (ResultSet rs = stmt.executeQuery("SELECT t.id, t.amount, t.type, t.note, c.name as category_name, t.transaction_date FROM transactions t JOIN categories c ON t.category_id = c.id ORDER BY t.transaction_date DESC LIMIT 50")) {
                while (rs.next()) {
                    System.out.println("Transaction: ID=" + rs.getString("id") 
                        + ", Amount=" + rs.getBigDecimal("amount") 
                        + ", Type=" + rs.getString("type") 
                        + ", Note=[" + rs.getString("note") + "]"
                        + ", Category=[" + rs.getString("category_name") + "]"
                        + ", Date=" + rs.getTimestamp("transaction_date"));
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

