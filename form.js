class FORM {
    static createProfileForm(profile){
        const modal = document.createElement('div');

        modal.innerHTML = `
            <div class="modal" id="profile-form">
                <div class="header-modal">
                    <h2>TAK Contact Profile</h2>
                </div>
                <div class="modal-content">
                    <form method="post" class="my-form">
                        <div class="form-group">
                            <label>Contact info</label>
                            <div class="field-form">
                                <label for="fullname" class="label-form">Full Name:</label>
                                <input type="text" id="fullname" name="fullname" value="${profile.fullName}"class="input-form"/>
                            </div>
                            
                            <div class="field-form">
                                <label for="phoneNumber" class="label-form">Phone Number:</label>
                                <input type="tel" id="phoneNumber" name="phoneNumber" value="${profile.phoneNumber}" class="input-form"/>
                            </div>

                            <div class="field-form">
                                <label for="email" class="label-form">Email:</label>
                                <input type="email" id="email" name="email" value="${profile.emailAddress}" class="input-form"/>
                            </div>

                            <div class="field-form">
                                <label for="publicUrl" class="label-form">Public URL:</label>
                                <input type="text" id="publicUrl" name="publicUrl" value="${profile.profileUrl}" class="input-form"/>
                            </div>
                        </div>                    

                        <div class="form-group">
                            <label>Organization</label>
                            <div class="field-form">
                                <label for="company" class="label-form">Company:</label>
                                <input type="text" id="company" name="company" value="${profile.company}" class="input-form"/>
                            </div>

                            <div class="field-form">
                                <label for="title" class="label-form">Title:</label>
                                <input type="text" id="title" name="title" value="${profile.title}" class="input-form"/>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Other info</label>
                            <div class="field-form">
                                <label class="label-form" for="quiz">Drafted by quiz:</label>
                                <input type="checkbox" id="html" value="HTML" class="checkbox-form"/>
                            </div>

                            <div class="field-form">
                                <label for="keyword" class="label-form">Keyword:</label>
                                <input type="text" id="keyword" name="keyword" class="input-form"/>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="footer-modal">
                        <button type="submit" id="profile-cancel-button" class="btn cancel-btn">Cancel</button>
                        <button type="submit" id="profile-send-button"class="btn submit-btn">Send</button>
                </div>
            </div> 
        `;

        return modal;
    }
    
    static closeMenu(modal) {
        modal.remove();
    }
}
