import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class TestBcrypt {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String raw = "123456";
        String hash = "$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm";
        boolean match = encoder.matches(raw, hash);
        System.out.println("Matches: " + match);
        System.out.println("New Hash for 123456: " + encoder.encode(raw));
    }
}
