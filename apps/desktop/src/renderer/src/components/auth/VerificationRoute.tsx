import VerificationPage from "@workspace/ui/blocks/auth/VerificationPage";
import { useNavigate } from "react-router-dom";

export default function VerificationRoute() {
    const navigate = useNavigate();
    return (
        <VerificationPage
            errorMessage={"Email Not Verified"}
            successMessage={"Email Verified"}
            onBackToLoginClick={() => navigate('/sign-in')}
        />
    )
}